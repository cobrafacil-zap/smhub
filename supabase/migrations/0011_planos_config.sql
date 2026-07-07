-- ===========================================================================
-- 0011_planos_config.sql
-- ===========================================================================
-- Tabela de planos com valor mensal configurável pelo super-admin.
-- 3 planos fixos: basico, pro, enterprise. Valor pode ser editado.
-- ===========================================================================

create table if not exists public.planos (
  id text primary key check (id in ('basico', 'pro', 'enterprise')),
  nome text not null,
  valor_mensal numeric(10,2) not null default 0,
  descricao text,
  ativo boolean default true,
  updated_at timestamptz default now()
);

-- Insere os 3 planos padrão
insert into public.planos (id, nome, valor_mensal, descricao) values
  ('basico', 'Básico',     99.00,  'Para agências começando'),
  ('pro', 'Pro',         299.00,  'Para agências em crescimento'),
  ('enterprise', 'Enterprise', 799.00, 'Para agências consolidadas')
on conflict (id) do nothing;

-- Habilita RLS
alter table public.planos enable row level security;

-- Super-admin pode tudo
create policy "planos_all_super" on public.planos
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- Outros podem apenas ler (para exibir "Plano X — R$Y/mês" no app da agência)
create policy "planos_select_all" on public.planos
  for select using (true);

-- Trigger updated_at
create trigger trg_planos_updated_at
  before update on public.planos
  for each row execute function public.tg_set_updated_at();
