-- 0045: Desfaz o planejamento mensal (metas_mensais).
--
-- Reverte a migration 0044 (feature "metas/planejamento mensal" que veio do
-- Painel GL). O SM Hub volta a usar apenas os relatórios de métricas; a tabela
-- de metas é removida. Idempotente (if exists) para ambientes onde a 0044
-- nunca rodou.

drop table if exists public.metas_mensais;
