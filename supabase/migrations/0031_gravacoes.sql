-- ===========================================================================
-- 0031_gravacoes.sql
-- ===========================================================================
-- Calendário de gravações: sessões de filmagem/gravação da agência para um
-- cliente. Visível e EDITÁVEL tanto pela agência quanto pelo cliente (ambos
-- criam/editam/excluem). Escopo: cada gravação pertence a um cliente; a agência
-- vê todas as suas, o cliente só as suas.
-- ===========================================================================

create table if not exists public.gravacoes (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  data date not null,
  hora time,
  titulo text not null,
  descricao text,
  local text,
  status text not null default 'agendada'
    check (status in ('agendada','confirmada','concluida','cancelada')),
  criado_por uuid references public.usuarios(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_gravacoes_agencia on public.gravacoes(agencia_id);
create index if not exists idx_gravacoes_cliente on public.gravacoes(cliente_id);
create index if not exists idx_gravacoes_data on public.gravacoes(agencia_id, data);

-- updated_at automático (reusa função tg_set_updated_at de 0001)
drop trigger if exists trg_gravacoes_updated on public.gravacoes;
create trigger trg_gravacoes_updated before update on public.gravacoes
  for each row execute function public.tg_set_updated_at();

-- ===========================================================================
-- RLS: agência E cliente veem e editam as gravações do cliente.
-- ===========================================================================
alter table public.gravacoes enable row level security;

drop policy if exists "gravacoes_select" on public.gravacoes;
create policy "gravacoes_select" on public.gravacoes
  for select using (
    agencia_id = public.current_agencia_id(auth.uid())
    or cliente_id = public.current_cliente_id(auth.uid())
    or public.is_super_admin(auth.uid())
  );

drop policy if exists "gravacoes_insert" on public.gravacoes;
create policy "gravacoes_insert" on public.gravacoes
  for insert with check (
    (agencia_id = public.current_agencia_id(auth.uid()) and public.is_agencia_member(auth.uid()))
    or cliente_id = public.current_cliente_id(auth.uid())
    or public.is_super_admin(auth.uid())
  );

drop policy if exists "gravacoes_update" on public.gravacoes;
create policy "gravacoes_update" on public.gravacoes
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    or cliente_id = public.current_cliente_id(auth.uid())
    or public.is_super_admin(auth.uid())
  );

drop policy if exists "gravacoes_delete" on public.gravacoes;
create policy "gravacoes_delete" on public.gravacoes
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    or cliente_id = public.current_cliente_id(auth.uid())
    or public.is_super_admin(auth.uid())
  );