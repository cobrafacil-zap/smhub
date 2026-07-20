-- ===========================================================================
-- 0027_perf_indexes.sql — Índices para reduzir o tempo de carga das páginas
-- pesadas (financeiro, clientes/[id], listagens).
--
-- Contexto: as queries filtram por (agencia_id, <coluna de mês/data>) ou por
-- cliente_id. Os índices existentes cobrem agencia_id isolado e as chaves
-- únicas (cliente_id, mes/competencia) — mas NÃO cobrem o filtro combinado
-- "agência + mês" que o financeiro usa, nem data_vencimento das faturas, nem
-- transações por cliente. Sem esses índices o Postgres faz index scan em
-- agencia_id e filtra o resto em memória — piora conforme a agência cresce
-- (sintoma: páginas que demoram ~10s).
--
-- Combinado com a troca de leituras server-side para o client service-role
-- (bypassa a avaliação por linha do RLS), isso corta o tempo de carga.
-- ===========================================================================

-- FATURAS: financeiro filtra por agência + competência (janela de meses);
-- "a vencer"/"atrasadas" filtra por data_vencimento.
create index if not exists idx_faturas_agencia_competencia
  on public.faturas(agencia_id, competencia);
create index if not exists idx_faturas_vencimento
  on public.faturas(data_vencimento);

-- TRANSAÇÕES: financeiro filtra por agência + data_vencimento (mês);
-- FinanceiroTab do cliente filtra por cliente_id.
create index if not exists idx_transacoes_agencia_vencimento
  on public.transacoes(agencia_id, data_vencimento);
create index if not exists idx_transacoes_cliente
  on public.transacoes(cliente_id);

-- RELATÓRIOS: RelatoriosTab/admin filtram por agência + mes_referencia.
-- (cliente_id já é coberto por uniq_relatorio_cliente_mes_plat.)
create index if not exists idx_relatorios_agencia_mes
  on public.relatorios(agencia_id, mes_referencia);

-- PLANEJAMENTOS: listagem e abas filtram por agência + cliente + mês.
-- (cliente_id já é coberto por uniq_planejamento_cliente_mes.)
create index if not exists idx_planejamentos_agencia_cliente_mes
  on public.planejamentos(agencia_id, cliente_id, mes_referencia);