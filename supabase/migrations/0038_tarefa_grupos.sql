-- ===========================================================================
-- 0038_tarefa_grupos.sql
-- ===========================================================================
-- Agrupamentos de tarefas no kanban. Um "grupo" é um conjunto nomeado de
-- tarefas que compartilham um contexto (ex: "Artes — Acme • Entrega 25/07").
--
-- Dois modos:
--   - AUTOMÁTICO: criado pela `sincronizarTarefaDaEntrada` quando uma
--     entrada do planejamento vira tarefa. Chave de unicidade =
--     (agencia_id, quadro_id, cliente_id, data_entrega). Não pode ser
--     manual=false.
--   - MANUAL: criado pelo admin via TarefaDialog (sem cliente/data
--     fixos). marca `manual=true`.
--
-- Escopo: o grupo pertence a um `quadro_id` (FK NOT NULL). Excluir o
-- quadro dá cascade nos grupos; tarefas ficam com `grupo_id=null` via
-- ON DELETE SET NULL (não ficam órfãs).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabela tarefa_grupos
-- ---------------------------------------------------------------------------
create table if not exists public.tarefa_grupos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  quadro_id uuid references public.tarefa_quadros(id) on delete cascade not null,
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  cliente_id uuid references public.clientes(id) on delete set null,
  data_entrega date,
  manual boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unicidade dos grupos AUTOMÁTICOS: um (agencia, quadro, cliente, data)
-- só pode ter 1 grupo automático. Não vale pra manuais (cliente/data nulos).
create unique index if not exists idx_tarefa_grupos_auto
  on public.tarefa_grupos (agencia_id, quadro_id, cliente_id, data_entrega)
  where manual = false and cliente_id is not null and data_entrega is not null;

create index if not exists idx_tarefa_grupos_agencia on public.tarefa_grupos (agencia_id);
create index if not exists idx_tarefa_grupos_quadro on public.tarefa_grupos (quadro_id);

-- ---------------------------------------------------------------------------
-- 2) Coluna grupo_id em tarefas (ON DELETE SET NULL: apagar o grupo
--    não apaga as tarefas, só desagrupa).
-- ---------------------------------------------------------------------------
alter table public.tarefas
  add column if not exists grupo_id uuid references public.tarefa_grupos(id) on delete set null;

create index if not exists idx_tarefas_grupo on public.tarefas (grupo_id);

-- ---------------------------------------------------------------------------
-- 3) Trigger de updated_at (reutiliza tg_touch_updated_at)
-- ---------------------------------------------------------------------------
drop trigger if exists trg_tarefa_grupos_touch on public.tarefa_grupos;
create trigger trg_tarefa_grupos_touch
  before update on public.tarefa_grupos
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4) RLS (mesmo padrão de tarefa_quadros da 0036)
-- ---------------------------------------------------------------------------
alter table public.tarefa_grupos enable row level security;

drop policy if exists "tarefa_grupos_select_agencia" on public.tarefa_grupos;
create policy "tarefa_grupos_select_agencia" on public.tarefa_grupos
  for select using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_grupos_select_super" on public.tarefa_grupos;
create policy "tarefa_grupos_select_super" on public.tarefa_grupos
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "tarefa_grupos_insert_agencia" on public.tarefa_grupos;
create policy "tarefa_grupos_insert_agencia" on public.tarefa_grupos
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_grupos_update_agencia" on public.tarefa_grupos;
create policy "tarefa_grupos_update_agencia" on public.tarefa_grupos
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  )
  with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_grupos_delete_agencia" on public.tarefa_grupos;
create policy "tarefa_grupos_delete_agencia" on public.tarefa_grupos
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
