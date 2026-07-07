-- ===========================================================================
-- 0012_convites_set_password.sql
-- ===========================================================================
-- Tabela de convites: tokens únicos que o cliente usa para definir a própria
-- senha no primeiro acesso.
-- ===========================================================================

create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,                 -- token que vai na URL
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  email text not null,
  role text not null default 'cliente' check (role in ('cliente', 'admin_agencia', 'membro_equipe')),
  user_id uuid references auth.users(id) on delete cascade, -- preenchido após uso
  usado_em timestamptz,
  expira_em timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

create index idx_convites_token on public.convites(token);
create index idx_convites_cliente on public.convites(cliente_id);

-- RLS
alter table public.convites enable row level security;

-- Admin pode ver/inserir/deletar convites da própria agência
create policy "convites_all_agencia" on public.convites
  for all using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  )
  with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- Super-admin pode tudo
create policy "convites_all_super" on public.convites
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- Qualquer pessoa pode LER pelo token (pra validar na página pública)
-- Mas a leitura por token é feita via service-role, não passa por RLS.
