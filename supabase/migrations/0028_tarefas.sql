-- ===========================================================================
-- 0028_tarefas.sql
-- ===========================================================================
-- Kanban de micro-gestão da equipe.
--   tarefas              -> cards do quadro (status = coluna do kanban)
--   tarefa_responsaveis -> multi-atribuição (uma tarefa pode ter N pessoas)
--
-- RLS: só membros da agência (admin_agencia/membro_equipe) veem/editam.
-- Clientes (role=cliente) NÃO veem tarefas — is_agencia_member() já os exclui.
--
-- Aproveita para tornar convites.cliente_id nullable, permitindo convites de
-- EQUIPE (sem cliente vinculado) reusando o mesmo fluxo de link do cliente.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Helpers de RLS (re-declarados de 0002_rls.sql para tornar esta migration
-- autossuficiente). create or replace é idempotente: se as funções já existem
-- (mesma definição) é no-op; se faltam (0002 não aplicado neste banco), cria.
-- Sem isso, as policies abaixo abortam com "function current_agencia_id(uuid)
-- does not exist".
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.super_admins where user_id = uid and ativo = true);
$$;

create or replace function public.current_agencia_id(uid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select agencia_id from public.usuarios where user_id = uid limit 1;
$$;

create or replace function public.is_agencia_member(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.usuarios
    where user_id = uid
      and role in ('admin_agencia','membro_equipe')
      and ativo = true
  );
$$;

create or replace function public.current_cliente_id(uid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.clientes where user_id = uid limit 1;
$$;

-- ---------------------------------------------------------------------------
-- TAREFAS
-- ---------------------------------------------------------------------------
create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  cliente_id uuid references public.clientes(id) on delete set null,
  criado_por uuid references public.usuarios(id) on delete set null not null,
  titulo text not null,
  descricao text,
  status text not null default 'a_fazer'
    check (status in ('a_fazer','em_andamento','revisao','concluido')),
  prioridade text not null default 'media'
    check (prioridade in ('baixa','media','alta','urgente')),
  prazo date,
  ordem integer not null default 0,
  arquivado boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tarefas_agencia on public.tarefas(agencia_id);
create index if not exists idx_tarefas_status on public.tarefas(agencia_id, status);
create index if not exists idx_tarefas_cliente on public.tarefas(cliente_id);
create index if not exists idx_tarefas_prazo on public.tarefas(prazo);
create index if not exists idx_tarefas_arquivado on public.tarefas(agencia_id, arquivado);

-- updated_at automático (reusa função tg_set_updated_at definida em 0001)
drop trigger if exists trg_tarefas_updated on public.tarefas;
create trigger trg_tarefas_updated before update on public.tarefas
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- RESPONSAVEIS (multi-atribuicao)
-- ---------------------------------------------------------------------------
create table if not exists public.tarefa_responsaveis (
  tarefa_id uuid references public.tarefas(id) on delete cascade not null,
  usuario_id uuid references public.usuarios(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (tarefa_id, usuario_id)
);

create index if not exists idx_tarefa_resp_usuario on public.tarefa_responsaveis(usuario_id);
create index if not exists idx_tarefa_resp_tarefa on public.tarefa_responsaveis(tarefa_id);

-- ---------------------------------------------------------------------------
-- CONVITES: cliente_id nullable (permite convite de EQUIPE sem cliente)
-- ---------------------------------------------------------------------------
alter table public.convites alter column cliente_id drop not null;

-- O índice original (idx_convites_cliente) continua válido para clientes;
-- não há necessidade de índice parcial aqui.

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.tarefas enable row level security;
alter table public.tarefa_responsaveis enable row level security;

-- TAREFAS
drop policy if exists "tarefas_select_agencia" on public.tarefas;
create policy "tarefas_select_agencia" on public.tarefas
  for select using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefas_select_super" on public.tarefas;
create policy "tarefas_select_super" on public.tarefas
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "tarefas_insert_agencia" on public.tarefas;
create policy "tarefas_insert_agencia" on public.tarefas
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefas_update_agencia" on public.tarefas;
create policy "tarefas_update_agencia" on public.tarefas
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  )
  with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefas_delete_agencia" on public.tarefas;
create policy "tarefas_delete_agencia" on public.tarefas
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- TAREFA_RESPONSAVEIS
drop policy if exists "tarefa_resp_select_agencia" on public.tarefa_responsaveis;
create policy "tarefa_resp_select_agencia" on public.tarefa_responsaveis
  for select using (
    tarefa_id in (
      select id from public.tarefas
      where agencia_id = public.current_agencia_id(auth.uid())
    )
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_resp_select_super" on public.tarefa_responsaveis;
create policy "tarefa_resp_select_super" on public.tarefa_responsaveis
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "tarefa_resp_insert_agencia" on public.tarefa_responsaveis;
create policy "tarefa_resp_insert_agencia" on public.tarefa_responsaveis
  for insert with check (
    tarefa_id in (
      select id from public.tarefas
      where agencia_id = public.current_agencia_id(auth.uid())
    )
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_resp_update_agencia" on public.tarefa_responsaveis;
create policy "tarefa_resp_update_agencia" on public.tarefa_responsaveis
  for update using (
    tarefa_id in (
      select id from public.tarefas
      where agencia_id = public.current_agencia_id(auth.uid())
    )
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_resp_delete_agencia" on public.tarefa_responsaveis;
create policy "tarefa_resp_delete_agencia" on public.tarefa_responsaveis
  for delete using (
    tarefa_id in (
      select id from public.tarefas
      where agencia_id = public.current_agencia_id(auth.uid())
    )
    and public.is_agencia_member(auth.uid())
  );