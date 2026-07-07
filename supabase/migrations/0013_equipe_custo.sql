-- 0013_equipe_custo.sql
-- Adiciona campo de custo mensal aos usuários da equipe (admin/membros)
-- para uso no módulo financeiro da agência

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS custo_mensal NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN public.usuarios.custo_mensal IS
  'Custo mensal do colaborador para a agência (RH). Usado em DRE e fluxo de caixa.';
