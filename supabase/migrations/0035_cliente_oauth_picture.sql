-- ===========================================================================
-- 0035_cliente_oauth_picture.sql
-- ===========================================================================
-- Adiciona a URL da foto (Página/Instagram) à conexão OAuth, para o card de
-- "Redes sociais" mostrar o avatar da conta conectada. URL é CDN pública da
-- Meta (não sensível).
-- ===========================================================================

alter table public.cliente_oauth_contas
  add column if not exists account_picture_url text;

comment on column public.cliente_oauth_contas.account_picture_url is
  'URL pública da foto (Página do Facebook / perfil do Instagram).';