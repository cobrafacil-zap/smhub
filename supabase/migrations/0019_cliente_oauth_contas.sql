-- ===========================================================================
-- 0019_cliente_oauth_contas.sql
-- ===========================================================================
-- Tabela dedicada para tokens OAuth de Instagram/Facebook (Meta Graph API).
--
-- Tokens armazenados CRIPTOGRAFADOS em repouso (AES-256-GCM, chave
-- TOKEN_ENCRYPTION_KEY) — colunas access_token_ciphertext/iv/tag.
-- Um cliente pode ter uma conexão por provider (instagram, facebook).
--
-- Usada pelo fluxo "Importar métricas" no formulário de relatório: o admin
-- conecta a conta uma vez (OAuth) e depois pré-preenche relatórios com as
-- métricas puxadas da Graph API.
-- ===========================================================================

create table if not exists public.cliente_oauth_contas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  provider text not null check (provider in ('instagram','facebook')),
  external_id text not null,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  access_token_tag  text not null,
  token_expires_at timestamptz,
  scopes text,
  account_handle text,
  account_name text,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (cliente_id, provider)
);

create index if not exists idx_cliente_oauth_cliente
  on public.cliente_oauth_contas(cliente_id);
create index if not exists idx_cliente_oauth_agencia
  on public.cliente_oauth_contas(agencia_id);

alter table public.cliente_oauth_contas enable row level security;

-- 1) Select: membros da própria agência
create policy "cliente_oauth_select_own_agencia" on public.cliente_oauth_contas
  for select using (
    agencia_id in (select agencia_id from public.usuarios where user_id = auth.uid())
  );

-- 2) Admin/membro: todas as operações, scoped pela própria agência
create policy "cliente_oauth_admin_all" on public.cliente_oauth_contas
  for all using (
    agencia_id in (
      select u.agencia_id from public.usuarios u
      where u.user_id = auth.uid() and u.role in ('admin_agencia','membro_equipe')
    )
  )
  with check (
    agencia_id in (
      select u.agencia_id from public.usuarios u
      where u.user_id = auth.uid() and u.role in ('admin_agencia','membro_equipe')
    )
  );

-- 3) Super-admin: todas as operações
create policy "cliente_oauth_super_all" on public.cliente_oauth_contas
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

comment on table public.cliente_oauth_contas is
  'Tokens OAuth de Instagram/Facebook (Meta Graph API). Tokens cifrados em repouso (AES-256-GCM).';
comment on column public.cliente_oauth_contas.external_id is
  'IG: instagram_business_account id. FB: page_id.';
comment on column public.cliente_oauth_contas.access_token_ciphertext is
  'Token de acesso cifrado (AES-256-GCM, chave TOKEN_ENCRYPTION_KEY).';
comment on column public.cliente_oauth_contas.access_token_iv is
  'IV (12 bytes) usado na cifragem do token.';
comment on column public.cliente_oauth_contas.access_token_tag is
  'Auth tag GCM do token cifrado.';
comment on column public.cliente_oauth_contas.token_expires_at is
  'Expiração do long-lived token (~60 dias). Renovar antes de expirar.';
comment on column public.cliente_oauth_contas.scopes is
  'Scopes concedidos no momento da conexão (trilha de consentimento).';