-- ===========================================================================
-- 0016_signup_tokens.sql
-- ===========================================================================
-- Tokens para novos admins/agências que se cadastram via checkout do MP.
-- Semelhante a `convites`, mas para contas de admin de agência.
-- ===========================================================================

create table if not exists public.signup_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  email text not null,
  nome text not null,
  nome_agencia text not null,
  plano text not null,
  user_id uuid references auth.users(id) on delete cascade,
  agencia_id uuid references public.agencias(id) on delete cascade,
  usado_em timestamptz,
  expira_em timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

create index idx_signup_tokens_token on public.signup_tokens(token);
create index idx_signup_tokens_email on public.signup_tokens(email);

alter table public.signup_tokens enable row level security;

-- Super-admin tudo
create policy "signup_tokens_super_all" on public.signup_tokens
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));
