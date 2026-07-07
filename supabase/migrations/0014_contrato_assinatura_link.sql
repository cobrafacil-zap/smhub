-- 0014_contrato_assinatura_link.sql
-- Adiciona token de assinatura público aos contratos (mesmo padrão dos convites).
-- Quando o admin clica em "Gerar link de assinatura", é gerado um token único
-- com validade de 7 dias. O cliente acessa /assinar-contrato?token=... e assina
-- sem precisar de login.

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS token_assinatura TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS token_expira_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS link_gerado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS contratos_token_assinatura_idx
  ON public.contratos(token_assinatura)
  WHERE token_assinatura IS NOT NULL;

COMMENT ON COLUMN public.contratos.token_assinatura IS
  'Token público único para o cliente assinar o contrato sem login. Gerado on-demand.';
COMMENT ON COLUMN public.contratos.token_expira_em IS
  'Validade do token de assinatura (default 7 dias).';
COMMENT ON COLUMN public.contratos.link_gerado_em IS
  'Data/hora em que o último link de assinatura foi gerado.';

-- NOTA: a leitura/escrita do contrato via token é feita pelo backend usando
-- createAdminClient() (bypassa RLS), portanto não precisamos de policies
-- públicas. O token funciona como uma chave de API opaca.

