-- ===========================================================================
-- 0015_assinatura_ativa.sql
-- ===========================================================================
-- Tabela de assinaturas (paga / trial / pendente) por agência.
-- Suporta 7 dias grátis de trial com limite de 10 clientes por agência.
-- ===========================================================================

create table if not exists public.assinatura_ativa (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  plano text not null check (plano in ('basico','pro','enterprise')),
  status text not null default 'pendente'
    check (status in ('pendente','paga','vencida','cancelada','trial')),
  periodo_inicio timestamptz not null default now(),
  periodo_fim timestamptz not null,
  valor_pago numeric(10,2),
  mp_payment_id text,
  mp_preference_id text,
  mp_status_detail text,
  grace_period_dias int default 5,
  is_trial boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_assinatura_agencia on public.assinatura_ativa(agencia_id);
create index idx_assinatura_status on public.assinatura_ativa(status, periodo_fim);

-- Histórico imutável de cobranças
create table if not exists public.assinatura_pagamentos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  assinatura_id uuid references public.assinatura_ativa(id) on delete cascade,
  mp_payment_id text unique,
  mp_status text,
  mp_status_detail text,
  valor numeric(10,2) not null,
  metodo text,
  payload jsonb,
  created_at timestamptz default now()
);
create index idx_pagamentos_agencia on public.assinatura_pagamentos(agencia_id);

-- ===========================================================================
-- Helpers
-- ===========================================================================

-- Vigente = status=paga/trial e periodo_fim > now()
create or replace function public.is_assinatura_vigente(ag uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.assinatura_ativa a
    where a.agencia_id = ag
      and a.status in ('paga','trial')
      and a.periodo_fim > now()
  );
$$;

-- Bloqueada = sem assinatura OU vencida + grace expirado
create or replace function public.is_agencia_bloqueada(ag uuid)
returns boolean
language plpgsql
stable
as $$
declare
  v_status text;
  v_fim timestamptz;
  v_grace int;
begin
  select status, periodo_fim, grace_period_dias
    into v_status, v_fim, v_grace
    from public.assinatura_ativa
    where agencia_id = ag
    order by periodo_fim desc
    limit 1;

  if v_status is null then return true; end if;
  if v_status in ('paga','trial') and v_fim > now() then return false; end if;
  if v_fim + (v_grace || ' days')::interval > now() then return false; end if;
  return true;
end;
$$;

-- Em trial?
create or replace function public.is_agencia_trial(ag uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.assinatura_ativa a
    where a.agencia_id = ag
      and a.is_trial = true
      and a.status = 'trial'
      and a.periodo_fim > now()
  );
$$;

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.assinatura_ativa enable row level security;
alter table public.assinatura_pagamentos enable row level security;

create policy "assinatura_super_all" on public.assinatura_ativa
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

create policy "pagamentos_super_all" on public.assinatura_pagamentos
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

create policy "assinatura_own_select" on public.assinatura_ativa
  for select using (
    agencia_id in (select agencia_id from public.usuarios where user_id = auth.uid())
  );

create policy "pagamentos_own_select" on public.assinatura_pagamentos
  for select using (
    agencia_id in (select agencia_id from public.usuarios where user_id = auth.uid())
  );

-- Trigger updated_at
create trigger trg_assinatura_updated_at
  before update on public.assinatura_ativa
  for each row execute function public.tg_set_updated_at();

-- ===========================================================================
-- Trial inicial para todas agências ativas existentes (7 dias)
-- ===========================================================================
insert into public.assinatura_ativa (agencia_id, plano, status, periodo_inicio, periodo_fim, is_trial)
select
  a.id,
  a.plano,
  'trial',
  now(),
  now() + interval '7 days',
  true
from public.agencias a
where a.status = 'ativa'
  and not exists (
    select 1 from public.assinatura_ativa s
    where s.agencia_id = a.id
  );
