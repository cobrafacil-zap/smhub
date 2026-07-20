-- ===========================================================================
-- 0025_planejamento_dias_postagem.sql
-- ===========================================================================
-- Dias de postagem padrão do mês (seleção do admin no planejamento).
-- Armazena um array de inteiros 0..6 (getDay do JS: 0=Dom, 1=Seg, ... 6=Sáb).
-- O calendário tinta sutilmente as colunas/dias cujo dia da semana está aqui.
-- É config por planejamento (um por cliente/mês), então "fica salva no mês".
-- ===========================================================================

alter table public.planejamentos
  add column if not exists dias_postagem jsonb;

comment on column public.planejamentos.dias_postagem is
  'Array de dias da semana (0=Dom..6=Sáb) marcados como dias de postagem pelo admin. NULL = nenhum.';