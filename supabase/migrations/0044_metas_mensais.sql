-- 0044: Planejamento mensal (metas) por cliente.
--
-- No início do mês a agência define quanto vai investir e qual a meta de
-- comissões; ao longo do mês atualiza o realizado. Uma linha por
-- (cliente, mês). Separado dos relatórios de métricas (que medem audiência/
-- engajamento) para cada coisa ter um sentido claro: meta = dinheiro.

create table if not exists public.metas_mensais (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null references public.agencias(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  mes date not null, -- sempre dia 01 (YYYY-MM-01)
  investimento_previsto numeric(12,2) not null default 0,
  meta_comissoes numeric(12,2) not null default 0,
  investimento_realizado numeric(12,2) not null default 0,
  comissoes_realizadas numeric(12,2) not null default 0,
  /** Leads (pessoas) alcançadas no mês — base do rendimento por lead. */
  leads_realizados integer not null default 0,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (cliente_id, mes)
);
create index if not exists idx_metas_mensais_cliente
  on public.metas_mensais(cliente_id, mes desc);

alter table public.metas_mensais enable row level security;

create policy "metas_select_agencia" on public.metas_mensais
  for select using (agencia_id = public.current_agencia_id(auth.uid()));
create policy "metas_select_cliente" on public.metas_mensais
  for select using (cliente_id = public.current_cliente_id(auth.uid()));
create policy "metas_select_super" on public.metas_mensais
  for select using (public.is_super_admin(auth.uid()));

create policy "metas_insert_agencia" on public.metas_mensais
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "metas_update_agencia" on public.metas_mensais
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "metas_delete_agencia" on public.metas_mensais
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
