-- ===========================================================================
-- 0039_cliente_perfil_prefs.sql
-- ===========================================================================
-- Dados pessoais da cliente auto-gerenciados em /cliente/conta:
--   - foto_perfil: URL da foto de perfil (upload da própria cliente, no bucket
--     client-assets). Distinta da logo da empresa (logo_url).
--   - empresas_referencia: lista de empresas de referência/inspiração que a
--     cliente gosta [{"nome","url","motivo"}]. Visível para a agência.
--   - recebe_datas_comemorativas: preferência da cliente de receber (ou não)
--     sugestões de datas comemorativas no planejamento. Default true.
--
-- RLS: a policy existente `clientes_update_self` (user_id = auth.uid(), criada
-- na 0008) é por linha, não por coluna → cobre as colunas novas sem policy extra.
-- ===========================================================================

alter table public.clientes add column if not exists foto_perfil text;
alter table public.clientes add column if not exists empresas_referencia jsonb default '[]'::jsonb;
alter table public.clientes add column if not exists recebe_datas_comemorativas boolean default true;

comment on column public.clientes.foto_perfil is 'URL da foto de perfil (upload da própria cliente).';
comment on column public.clientes.empresas_referencia is 'Empresas de referência/inspiração da cliente: [{"nome","url","motivo"}]';
comment on column public.clientes.recebe_datas_comemorativas is 'Preferência: receber sugestões de datas comemorativas (default true).';