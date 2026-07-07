-- ===========================================================================
-- 0001_init.sql — Schema inicial SM Hub
-- Multi-tenant: toda tabela (exceto super_admins) tem agencia_id.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ===========================================================================
-- SUPER ADMINS (nível 1 — operadores da plataforma)
-- ===========================================================================
create table public.super_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  nome text not null,
  email text unique not null,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- ===========================================================================
-- AGÊNCIAS
-- ===========================================================================
create table public.agencias (
  id uuid primary key default gen_random_uuid(),
  nome_fantasia text not null,
  razao_social text,
  cnpj text unique,
  logo_url text,
  cor_primaria text default '#3D5AFE',
  endereco text,
  telefone text,
  email_contato text,
  status text default 'ativa' check (status in ('ativa','suspensa','cancelada')),
  plano text default 'basico' check (plano in ('basico','pro','enterprise')),
  trial_ate timestamptz default (now() + interval '14 days'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_agencias_status on public.agencias(status);

-- ===========================================================================
-- USUÁRIOS (vinculados a uma agência)
-- ===========================================================================
create table public.usuarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  agencia_id uuid references public.agencias(id) on delete cascade,
  nome text not null,
  email text unique not null,
  telefone text,
  avatar_url text,
  role text not null check (role in ('super_admin','admin_agencia','membro_equipe','cliente')),
  cargo text,
  ativo boolean default true,
  created_at timestamptz default now()
);

create index idx_usuarios_user_id on public.usuarios(user_id);
create index idx_usuarios_agencia on public.usuarios(agencia_id);

-- ===========================================================================
-- CLIENTES
-- ===========================================================================
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  nome_empresa text not null,
  nome_responsavel text not null,
  email text,
  telefone text,
  cnpj_cpf text,
  endereco text,
  segmento text,
  logo_url text,
  status text default 'ativo' check (status in ('ativo','inativo','pausado')),
  valor_mensal numeric(10,2),
  dia_vencimento integer check (dia_vencimento between 1 and 31),
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_clientes_agencia on public.clientes(agencia_id);
create index idx_clientes_status on public.clientes(agencia_id, status);

-- ===========================================================================
-- PLANEJAMENTO EDITORIAL
-- ===========================================================================
create table public.planejamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  mes_referencia date not null,
  status text default 'rascunho' check (status in ('rascunho','aprovado','em_execucao','concluido')),
  objetivo_geral text,
  observacoes text,
  created_at timestamptz default now()
);

create unique index uniq_planejamento_cliente_mes
  on public.planejamentos(cliente_id, mes_referencia);
create index idx_planejamentos_agencia on public.planejamentos(agencia_id);

create table public.planejamento_entradas (
  id uuid primary key default gen_random_uuid(),
  planejamento_id uuid references public.planejamentos(id) on delete cascade not null,
  data date not null,
  tipo text not null check (tipo in ('post_feed','story','reels','carrossel','video','artigo')),
  titulo text not null,
  descricao text,
  copy text,
  hashtags text[],
  midia_url text[],
  status text default 'pendente' check (status in ('pendente','aprovado','publicado','rejeitado')),
  publicado_em timestamptz,
  created_at timestamptz default now()
);

create index idx_entradas_planejamento on public.planejamento_entradas(planejamento_id);
create index idx_entradas_data on public.planejamento_entradas(data);

create table public.datas_comemorativas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  nome text not null,
  segmento text[],
  created_at timestamptz default now()
);

create index idx_datas_data on public.datas_comemorativas(data);

-- ===========================================================================
-- RELATÓRIOS DE MÍDIAS SOCIAIS
-- ===========================================================================
create table public.relatorios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  mes_referencia date not null,
  plataforma text not null check (plataforma in ('instagram','facebook','tiktok','linkedin','youtube','twitter')),
  seguidores_inicio integer default 0,
  seguidores_fim integer default 0,
  alcance_total bigint default 0,
  impressoes bigint default 0,
  total_posts integer default 0,
  total_reels integer default 0,
  total_stories integer default 0,
  total_curtidas bigint default 0,
  leads_validados integer default 0,
  investimento_ads numeric(10,2) default 0,
  receita_gerada numeric(10,2) default 0,
  observacoes text,
  created_at timestamptz default now()
);

create unique index uniq_relatorio_cliente_mes_plat
  on public.relatorios(cliente_id, mes_referencia, plataforma);
create index idx_relatorios_agencia on public.relatorios(agencia_id);

create table public.relatorio_metricas_diarias (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid references public.relatorios(id) on delete cascade not null,
  data date not null,
  alcance integer default 0,
  impressoes integer default 0,
  curtidas integer default 0,
  comentarios integer default 0,
  compartilhamentos integer default 0,
  novos_seguidores integer default 0,
  leads_estimados integer default 0,
  leads_validados integer default 0
);

create index idx_metricas_relatorio on public.relatorio_metricas_diarias(relatorio_id);

-- ===========================================================================
-- FINANCEIRO
-- ===========================================================================
create table public.transacoes (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  cliente_id uuid references public.clientes(id) on delete set null,
  tipo text not null check (tipo in ('receita','despesa')),
  categoria text not null,
  descricao text not null,
  valor numeric(10,2) not null,
  data_vencimento date not null,
  data_pagamento date,
  status text default 'pendente' check (status in ('pendente','pago','atrasado','cancelado')),
  comprovante_url text,
  recorrente boolean default false,
  created_at timestamptz default now()
);

create index idx_transacoes_agencia on public.transacoes(agencia_id);
create index idx_transacoes_tipo on public.transacoes(agencia_id, tipo);
create index idx_transacoes_status on public.transacoes(agencia_id, status);
create index idx_transacoes_vencimento on public.transacoes(data_vencimento);

create table public.faturas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  competencia date not null,
  valor numeric(10,2) not null,
  data_vencimento date not null,
  status text default 'pendente' check (status in ('pendente','pago','atrasado')),
  numero text,
  itens jsonb,
  pdf_url text,
  created_at timestamptz default now()
);

create unique index uniq_fatura_cliente_competencia
  on public.faturas(cliente_id, competencia);
create index idx_faturas_agencia on public.faturas(agencia_id);
create index idx_faturas_status on public.faturas(agencia_id, status);

-- ===========================================================================
-- CONTRATOS
-- ===========================================================================
create table public.contrato_templates (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade,
  nome text not null,
  descricao text,
  conteudo text not null,
  variaveis jsonb,
  is_global boolean default false,
  created_at timestamptz default now()
);

create index idx_templates_agencia on public.contrato_templates(agencia_id);
create index idx_templates_global on public.contrato_templates(is_global);

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  template_id uuid references public.contrato_templates(id) on delete set null,
  titulo text not null,
  conteudo text not null,
  valor_mensal numeric(10,2),
  duracao_meses integer,
  data_inicio date,
  data_fim date,
  status text default 'rascunho' check (status in ('rascunho','enviado','assinado','ativo','encerrado','cancelado')),
  pdf_url text,
  assinaturas jsonb,
  variaveis jsonb,
  created_at timestamptz default now()
);

create index idx_contratos_agencia on public.contratos(agencia_id);
create index idx_contratos_cliente on public.contratos(cliente_id);
create index idx_contratos_status on public.contratos(agencia_id, status);

-- ===========================================================================
-- BRIEFINGS
-- ===========================================================================
create table public.briefings (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  respostas jsonb not null,
  preenchido_por uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index idx_briefings_cliente on public.briefings(cliente_id);
create index idx_briefings_agencia on public.briefings(agencia_id);

-- ===========================================================================
-- TRIGGERS: updated_at automático em agencias e clientes
-- ===========================================================================
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_agencias_updated_at
  before update on public.agencias
  for each row execute function public.tg_set_updated_at();

create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.tg_set_updated_at();
