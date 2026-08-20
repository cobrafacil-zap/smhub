-- ===========================================================================
-- 0040_tarefa_colunas.sql
-- ===========================================================================
-- Colunas nomeáveis dentro de cada quadro de tarefas. Antes desta migration
-- o "status" da tarefa era gravado como TEXT (CHECK em 4 valores fixos:
-- 'destinada','em_andamento','pronta','entregue'). Agora cada tarefa aponta
-- para uma `tarefa_coluna` (FK NOT NULL), que tem um `slug` canônico (mesmo
-- conjunto de 4 valores, mais suporte a slugs custom) e um `nome` exibido
-- (editável pelo admin — "A Fazer", "Em andamento", "Em revisão", "Concluído"
-- são os defaults mas podem ser renomeados por quadro).
--
-- Estratégia:
--   1) Criar tarefa_colunas.
--   2) Backfill: pra cada quadro existente, inserir 4 colunas default (com
--      nome amigável).
--   3) Adicionar tarefas.tarefa_coluna_id (nullable), backfill a partir do
--      status antigo, setar NOT NULL.
--   4) RLS + trigger de updated_at.
--   5) Dropar CHECK de status e a coluna `status` (já não usada).
--
-- Toda a migration é idempotente: pode ser rodada várias vezes sem efeito
-- colateral (criação usa IF NOT EXISTS, backfill usa ON CONFLICT, drop é
-- condicional).
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
-- 2) Backfill: pra cada quadro, insere as 4 colunas default se ainda não
--    existirem. Idempotente via ON CONFLICT.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  aid uuid;
begin
  for r in select id from public.tarefa_quadros loop
    aid := public._tarefa_quadro_agencia(r.id);
    if aid is null then continue; end if;

    insert into public.tarefa_colunas (agencia_id, quadro_id, slug, nome, ordem)
    values
      (aid, r.id, 'destinada',     'A Fazer',       0),
      (aid, r.id, 'em_andamento',  'Em andamento',  1),
      (aid, r.id, 'pronta',        'Em revisão',    2),
      (aid, r.id, 'entregue',      'Concluído',     3)
    on conflict (quadro_id, slug) do nothing;
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- 3) tarefa_coluna_id em tarefas (nullable -> backfill -> NOT NULL)
-- ---------------------------------------------------------------------------
alter table public.tarefas
  add column if not exists tarefa_coluna_id uuid
    references public.tarefa_colunas(id) on delete restrict;

-- Backfill: mapeia status antigo -> coluna default do mesmo quadro.
-- Tarefas sem status válido (não deveria acontecer) ficam sem coluna; o
-- NOT NULL abaixo vai forçar a tratar isso manualmente se ocorrer.
update public.tarefas t
   set tarefa_coluna_id = c.id
  from public.tarefa_colunas c
 where c.quadro_id = t.quadro_id
   and c.slug = t.status
   and t.tarefa_coluna_id is null;

-- Se sobrou tarefa sem coluna (status desconhecido / corrompido), aponta
-- pra coluna default 'destinada' do mesmo quadro como fallback. Esse
-- fallback NUNCA deveria disparar em dados legados porque o CHECK antigo
-- restringia status aos 4 valores — mas protege contra mudanças futuras.
do $$
declare r record;
begin
  for r in
    select t.id as tarefa_id, t.quadro_id
      from public.tarefas t
     where t.tarefa_coluna_id is null
  loop
    update public.tarefas
       set tarefa_coluna_id = (
         select id from public.tarefa_colunas
          where quadro_id = r.quadro_id and slug = 'destinada'
          limit 1
       )
     where id = r.tarefa_id;
  end loop;
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
