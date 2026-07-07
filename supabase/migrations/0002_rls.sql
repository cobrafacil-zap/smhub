-- ===========================================================================
-- 0002_rls.sql — Row Level Security do SM Hub
-- 3 níveis:
--   - super_admin (tabela super_admins)
--   - admin_agencia / membro_equipe (acesso à própria agencia_id)
--   - cliente (acesso apenas ao próprio user_id em clientes)
-- ===========================================================================

-- Habilita RLS em todas as tabelas
alter table public.super_admins enable row level security;
alter table public.agencias enable row level security;
alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.planejamentos enable row level security;
alter table public.planejamento_entradas enable row level security;
alter table public.datas_comemorativas enable row level security;
alter table public.relatorios enable row level security;
alter table public.relatorio_metricas_diarias enable row level security;
alter table public.transacoes enable row level security;
alter table public.faturas enable row level security;
alter table public.contrato_templates enable row level security;
alter table public.contratos enable row level security;
alter table public.briefings enable row level security;

-- ===========================================================================
-- Helpers: funções security-definer para evitar recursão em policies
-- ===========================================================================
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

-- ===========================================================================
-- SUPER_ADMINS — visível apenas por si mesmo e por outros super-admins
-- ===========================================================================
create policy "super_admins_select" on public.super_admins
  for select using (public.is_super_admin(auth.uid()) or user_id = auth.uid());

-- Inserção/atualização/exclusão apenas via service role (admin actions).
-- Nenhuma policy de INSERT/UPDATE/DELETE → só o backend insere via service role.

-- ===========================================================================
-- AGENCIAS
-- ===========================================================================
create policy "agencias_select_super" on public.agencias
  for select using (public.is_super_admin(auth.uid()));

create policy "agencias_select_self" on public.agencias
  for select using (id = public.current_agencia_id(auth.uid()));

-- ===========================================================================
-- USUARIOS
-- ===========================================================================
create policy "usuarios_select_super" on public.usuarios
  for select using (public.is_super_admin(auth.uid()));

create policy "usuarios_select_agencia" on public.usuarios
  for select using (agencia_id = public.current_agencia_id(auth.uid()));

-- ===========================================================================
-- CLIENTES
-- ===========================================================================
create policy "clientes_select_super" on public.clientes
  for select using (public.is_super_admin(auth.uid()));

create policy "clientes_select_agencia" on public.clientes
  for select using (agencia_id = public.current_agencia_id(auth.uid()));

create policy "clientes_select_self" on public.clientes
  for select using (user_id = auth.uid());

-- ===========================================================================
-- PLANEJAMENTOS + ENTRADAS
-- ===========================================================================
create policy "plan_select_super" on public.planejamentos
  for select using (public.is_super_admin(auth.uid()));
create policy "plan_select_agencia" on public.planejamentos
  for select using (agencia_id = public.current_agencia_id(auth.uid()));
create policy "plan_select_cliente" on public.planejamentos
  for select using (cliente_id = public.current_cliente_id(auth.uid()));

create policy "entradas_select_via_plan" on public.planejamento_entradas
  for select using (
    planejamento_id in (
      select id from public.planejamentos
      where agencia_id = public.current_agencia_id(auth.uid())
         or cliente_id = public.current_cliente_id(auth.uid())
    )
    or public.is_super_admin(auth.uid())
  );

-- ===========================================================================
-- DATAS COMEMORATIVAS — leitura pública (dados compartilhados)
-- ===========================================================================
create policy "datas_select_all" on public.datas_comemorativas
  for select using (true);

-- ===========================================================================
-- RELATÓRIOS
-- ===========================================================================
create policy "relat_select_super" on public.relatorios
  for select using (public.is_super_admin(auth.uid()));
create policy "relat_select_agencia" on public.relatorios
  for select using (agencia_id = public.current_agencia_id(auth.uid()));
create policy "relat_select_cliente" on public.relatorios
  for select using (cliente_id = public.current_cliente_id(auth.uid()));

create policy "metricas_select_via_relat" on public.relatorio_metricas_diarias
  for select using (
    relatorio_id in (
      select id from public.relatorios
      where agencia_id = public.current_agencia_id(auth.uid())
         or cliente_id = public.current_cliente_id(auth.uid())
    )
    or public.is_super_admin(auth.uid())
  );

-- ===========================================================================
-- TRANSAÇÕES + FATURAS
-- ===========================================================================
create policy "transacoes_select_super" on public.transacoes
  for select using (public.is_super_admin(auth.uid()));
create policy "transacoes_select_agencia" on public.transacoes
  for select using (agencia_id = public.current_agencia_id(auth.uid()));

create policy "faturas_select_super" on public.faturas
  for select using (public.is_super_admin(auth.uid()));
create policy "faturas_select_agencia" on public.faturas
  for select using (agencia_id = public.current_agencia_id(auth.uid()));
create policy "faturas_select_cliente" on public.faturas
  for select using (cliente_id = public.current_cliente_id(auth.uid()));

-- ===========================================================================
-- CONTRATOS
-- ===========================================================================
create policy "templates_select_super" on public.contrato_templates
  for select using (public.is_super_admin(auth.uid()));
create policy "templates_select_agencia" on public.contrato_templates
  for select using (agencia_id is null or agencia_id = public.current_agencia_id(auth.uid()));

create policy "contratos_select_super" on public.contratos
  for select using (public.is_super_admin(auth.uid()));
create policy "contratos_select_agencia" on public.contratos
  for select using (agencia_id = public.current_agencia_id(auth.uid()));
create policy "contratos_select_cliente" on public.contratos
  for select using (cliente_id = public.current_cliente_id(auth.uid()));

-- ===========================================================================
-- BRIEFINGS
-- ===========================================================================
create policy "briefings_select_super" on public.briefings
  for select using (public.is_super_admin(auth.uid()));
create policy "briefings_select_agencia" on public.briefings
  for select using (agencia_id = public.current_agencia_id(auth.uid()));
create policy "briefings_select_cliente" on public.briefings
  for select using (cliente_id = public.current_cliente_id(auth.uid()));
