-- ============================================================================
-- Limpa prazos gravados como HOJE em tarefas já entregues.
--
-- Contexto: o commit 51f89cf "mover para 'entregue' grava prazo = data do
-- movimento" chegou a ficar em produção brevemente. Durante esse tempo, mover
-- uma tarefa para 'entregue' sobrescrevia o prazo com a data de hoje. Esse
-- comportamento foi revertido nos commits seguintes (cf85edb e 15bc450), mas
-- as tarefas que foram movidas durante o deploy quebrado ainda têm
-- prazo = CURRENT_DATE gravado no banco.
--
-- Este script zera o prazo SOMENTE das tarefas que:
--   1. Estão com status = 'entregue' (a coluna onde o bug se manifestou)
--   2. Têm prazo = data atual (o sintoma visível: badge "Hoje" no entregue)
--
-- É seguro rodar uma vez. Não afeta tarefas em outros status nem prazos
-- futuros. Para desfazer, basta rodar a versão com INSERT INTO de backup
-- antes — ou restaurar o backup do Supabase.
--
-- Como rodar:
--   1. Painel do Supabase → SQL Editor → New query
--   2. Cole este script inteiro
--   3. Clique em "Run"
-- ============================================================================

-- 1) Auditoria: veja antes quais tarefas serão afetadas.
SELECT id, titulo, status, prazo, atualizado_em
FROM public.tarefas
WHERE status = 'entregue'
  AND prazo = CURRENT_DATE;

-- 2) Limpeza: zera o prazo das tarefas acima. Idempotente.
UPDATE public.tarefas
SET prazo = NULL
WHERE status = 'entregue'
  AND prazo = CURRENT_DATE;

-- 3) Confirmação: deve retornar 0 linhas.
SELECT COUNT(*) AS restante
FROM public.tarefas
WHERE status = 'entregue'
  AND prazo = CURRENT_DATE;
