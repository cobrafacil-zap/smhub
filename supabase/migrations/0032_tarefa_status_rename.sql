-- ===========================================================================
-- 0032_tarefa_status_rename.sql
-- ===========================================================================
-- Renomeia os valores do status de tarefas para casar com os rótulos do kanban:
--   a_fazer  -> destinada
--   revisao  -> pronta
--   concluido -> entregue
--   em_andamento permanece.
--
-- Os rótulos do app já foram atualizados; isto alinha os valores no banco.
-- Não afeta planejamento_entradas.status (conjunto distinto) nem
-- planejamentos.status (rascunho/aprovado/em_execucao/concluido).
-- ===========================================================================

-- 1) Migra os dados existentes. Nenhum valor-destino coincide com outro
--    valor-origem, então a ordem não causa sobreposição.
update public.tarefas set status = 'destinada'  where status = 'a_fazer';
update public.tarefas set status = 'pronta'     where status = 'revisao';
update public.tarefas set status = 'entregue'   where status = 'concluido';

-- 2) Troca o CHECK de status (nome auto-gerado: tarefas_status_check).
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'tarefas_status_check'
      and conrelid = 'public.tarefas'::regclass
  ) then
    alter table public.tarefas drop constraint tarefas_status_check;
  end if;
end$$;

alter table public.tarefas
  add constraint tarefas_status_check
  check (status in ('destinada','em_andamento','pronta','entregue'));

-- 3) Atualiza o DEFAULT da coluna (era 'a_fazer').
alter table public.tarefas alter column status set default 'destinada';