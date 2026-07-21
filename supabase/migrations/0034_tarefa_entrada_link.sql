-- ===========================================================================
-- 0034_tarefa_entrada_link.sql
-- ===========================================================================
-- Ao atribuir um responsável (designer) a uma entrada do planejamento, cria
-- (ou atualiza) automaticamente uma tarefa no quadro do time — 1 tarefa por
-- entrada (reatribuir/editar atualiza a mesma tarefa).
--
-- prazo_entrega_dia_semana: dia da semana em que as peças da SEMANA SEGUINTE
-- devem estar prontas (0=Dom..6=Sáb, padrão 5=Sexta). Configurável por agência
-- em /admin/configuracoes. Ex.: post na semana que vem -> entrega até a sexta
-- desta semana. Se o post é da semana atual (prazo já passado), a tarefa nasce
-- com prioridade "urgente".
-- ===========================================================================

alter table public.agencias
  add column if not exists prazo_entrega_dia_semana int not null default 5
  check (prazo_entrega_dia_semana between 0 and 6);

-- Uma tarefa pode estar vinculada a uma entrada do planejamento (1:1).
-- on delete cascade: se a entrada é excluída, a tarefa automática some junto.
alter table public.tarefas
  add column if not exists entrada_id uuid references public.planejamento_entradas(id) on delete cascade;

-- Garante no máximo uma tarefa por entrada.
create unique index if not exists idx_tarefas_entrada_unique
  on public.tarefas(entrada_id) where entrada_id is not null;