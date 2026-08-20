-- ===========================================================================
-- 0040_tarefa_colunas.sql
-- ===========================================================================
-- Colunas nomeáveis dentro de cada quadro de tarefas. Antes desta migration
-- o "status" da tarefa era gravado como TEXT (CHECK em 4 valores fixos:
-- 'destinada','em_andamento','pronta','entregue'). Agora cada tarefa aponta
-- para uma `tarefa_coluna` (FK NOT NULL), que tem um `slug` canônico (mesmo
-- conjunto de 4 valores, mais suporte a slugs custom) e um `nome` exibido
-- (editável pelo admin).
--
-- Estratégia:
--   1) Criar tarefa_colunas.
--   2) Adicionar tarefas.tarefa_coluna_id (nullable), backfill a partir do
--      status antigo, setar NOT NULL.
--   3) RLS + trigger de updated_at.
--   4) Dropar CHECK de status e a coluna `status` (já não usada).
--
-- Quadros existentes e novos NASCEM SEM COLUNAS — o usuário cria as
-- colunas manualmente via "+ Adicionar outra lista" no kanban. Isso
-- garante que o fluxo seja realmente Trello-style (sem conjuntos
-- pré-definidos que não combinam com a realidade do cliente).
--
-- Toda a migration é idempotente: pode ser rodada várias vezes sem efeito
-- colateral (criação usa IF NOT EXISTS, backfill é seguro via fallback,
-- drop é condicional).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0) Helper local: devolve o agencia_id de um quadro. Existe só durante esta
--    migration (não precisa ficar global). Como o backfill roda sem sessão
--    autenticada, não dá pra usar `current_agencia_id(auth.uid())` aqui.
-- ---------------------------------------------------------------------------
create or replace function public._tarefa_quadro_agencia(qid uuid)
returns uuid language sql stable as $$
  select agencia_id from public.tarefa_quadros where id = qid
$$;

-- ---------------------------------------------------------------------------
-- 1) Tabela tarefa_colunas
-- ---------------------------------------------------------------------------
create table if not exists public.tarefa_colunas (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  quadro_id uuid references public.tarefa_quadros(id) on delete cascade not null,
  -- Slug canônico. Aceita os 4 valores herdados do enum antigo, mais
  -- "custom-<uuid>" pra colunas extras que o admin criar além do conjunto
  -- default. Mantém integridade referencial via UNIQUE (quadro_id, slug).
  slug text not null
    check (slug in ('destinada','em_andamento','pronta','entregue')
           or slug like 'custom-%'),
  nome text not null check (char_length(trim(nome)) between 1 and 40),
  ordem integer not null default 0,
  arquivada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quadro_id, slug)
);

create index if not exists idx_tarefa_colunas_quadro_ordem
  on public.tarefa_colunas (quadro_id, ordem)
  where not arquivada;

create index if not exists idx_tarefa_colunas_agencia
  on public.tarefa_colunas (agencia_id);

-- ---------------------------------------------------------------------------
-- 3) Backfill inteligente de colunas a partir das tarefas existentes
--
-- Pra cada quadro, varre as tarefas e descobre quais slugs de status
-- realmente existem lá. Cria UMA coluna por slug distinto (se ainda
-- não existir) com o nome = slug legível (ex: "destinada" → "A Fazer"
-- se for um dos 4 canônicos, ou mantém o slug pra custom). NÃO cria
-- as 4 colunas default — só as que o quadro já usava de fato.
-- ---------------------------------------------------------------------------
do $$
declare
  q record;
  s text;
  aid uuid;
  slug_count int;
  has_dest boolean;
  has_ea    boolean;
  has_pronta boolean;
  has_ent  boolean;
begin
  for q in select id from public.tarefa_quadros loop
    aid := public._tarefa_quadro_agencia(q.id);
    if aid is null then continue; end if;

    -- Descobre quais slugs canônicos existem nesse quadro.
    select
      exists(select 1 from public.tarefas where quadro_id = q.id and status = 'destinada'),
      exists(select 1 from public.tarefas where quadro_id = q.id and status = 'em_andamento'),
      exists(select 1 from public.tarefas where quadro_id = q.id and status = 'pronta'),
      exists(select 1 from public.tarefas where quadro_id = q.id and status = 'entregue')
    into has_dest, has_ea, has_pronta, has_ent;

    -- Cria coluna só pra slugs realmente usados. O nome inicial usa o
    -- rótulo "amigável" — o admin pode renomear depois (ou logo de cara).
    if has_dest then
      insert into public.tarefa_colunas (agencia_id, quadro_id, slug, nome, ordem)
      values (aid, q.id, 'destinada', 'A Fazer', 0)
      on conflict (quadro_id, slug) do nothing;
    end if;
    if has_ea then
      insert into public.tarefa_colunas (agencia_id, quadro_id, slug, nome, ordem)
      values (aid, q.id, 'em_andamento', 'Em andamento',
        (select coalesce(max(ordem),-1)+1 from public.tarefa_colunas where quadro_id = q.id))
      on conflict (quadro_id, slug) do nothing;
    end if;
    if has_pronta then
      insert into public.tarefa_colunas (agencia_id, quadro_id, slug, nome, ordem)
      values (aid, q.id, 'pronta', 'Em revisão',
        (select coalesce(max(ordem),-1)+1 from public.tarefa_colunas where quadro_id = q.id))
      on conflict (quadro_id, slug) do nothing;
    end if;
    if has_ent then
      insert into public.tarefa_colunas (agencia_id, quadro_id, slug, nome, ordem)
      values (aid, q.id, 'entregue', 'Concluído',
        (select coalesce(max(ordem),-1)+1 from public.tarefa_colunas where quadro_id = q.id))
      on conflict (quadro_id, slug) do nothing;
    end if;
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- 4) tarefa_coluna_id em tarefas (nullable -> backfill -> NOT NULL)
-- ---------------------------------------------------------------------------
alter table public.tarefas
  add column if not exists tarefa_coluna_id uuid
    references public.tarefa_colunas(id) on delete restrict;

-- Backfill: mapeia status antigo -> coluna do mesmo quadro.
-- Como o passo anterior criou exatamente 1 coluna por slug usado, a
-- junção aqui é 1-para-1.
update public.tarefas t
   set tarefa_coluna_id = c.id
  from public.tarefa_colunas c
 where c.quadro_id = t.quadro_id
   and c.slug = t.status
   and t.tarefa_coluna_id is null;

-- Se sobrou tarefa sem coluna (caso degenerado: status fora do conjunto
-- canônico), aborta a migration com mensagem clara em vez de falhar
-- silenciosamente no NOT NULL.
do $$
declare restantes int;
begin
  select count(*) into restantes from public.tarefas where tarefa_coluna_id is null;
  if restantes > 0 then
    raise exception 'Backfill falhou: % tarefa(s) sem tarefa_coluna_id (status fora do conjunto canônico?)', restantes;
  end if;
end$$;

-- Hard-fail se AINDA assim sobrou algo sem coluna (não deveria acontecer).
do $$
declare restantes int;
begin
  select count(*) into restantes from public.tarefas where tarefa_coluna_id is null;
  if restantes > 0 then
    raise exception 'Backfill falhou: % tarefa(s) sem tarefa_coluna_id após fallback', restantes;
  end if;
end$$;

alter table public.tarefas alter column tarefa_coluna_id set not null;

create index if not exists idx_tarefas_coluna
  on public.tarefas (tarefa_coluna_id);

-- ---------------------------------------------------------------------------
-- 4) Trigger de updated_at (reaproveita tg_touch_updated_at se já existir)
-- ---------------------------------------------------------------------------
drop trigger if exists trg_tarefa_colunas_touch on public.tarefa_colunas;
create trigger trg_tarefa_colunas_touch
  before update on public.tarefa_colunas
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5) RLS (mesmo padrão de tarefa_quadros 0036 / tarefa_grupos 0038)
-- ---------------------------------------------------------------------------
alter table public.tarefa_colunas enable row level security;

drop policy if exists "tarefa_colunas_select_agencia" on public.tarefa_colunas;
create policy "tarefa_colunas_select_agencia" on public.tarefa_colunas
  for select using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_colunas_select_super" on public.tarefa_colunas;
create policy "tarefa_colunas_select_super" on public.tarefa_colunas
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "tarefa_colunas_insert_agencia" on public.tarefa_colunas;
create policy "tarefa_colunas_insert_agencia" on public.tarefa_colunas
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_colunas_update_agencia" on public.tarefa_colunas;
create policy "tarefa_colunas_update_agencia" on public.tarefa_colunas
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  )
  with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_colunas_delete_agencia" on public.tarefa_colunas;
create policy "tarefa_colunas_delete_agencia" on public.tarefa_colunas
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 6) Limpa a coluna `status` antiga (já não é referenciada em nenhum lugar
--    do schema). Mantém o drop CONDICIONAL pra idempotência.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'tarefas_status_check'
      and conrelid = 'public.tarefas'::regclass
  ) then
    alter table public.tarefas drop constraint tarefas_status_check;
  end if;
end$$;

-- Só dropa a coluna se ela existir (proteção contra re-execução).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tarefas' and column_name = 'status'
  ) then
    alter table public.tarefas drop column status;
  end if;
end$$;
