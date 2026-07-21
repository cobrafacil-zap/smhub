-- ===========================================================================
-- 0030_cliente_update_entrada.sql
-- ===========================================================================
-- Corrige o bug "Erro ao registrar decisão" no portal do cliente.
--
-- A action clienteAprovarEntradaAction grava via createClient() (RLS aplicada),
-- mas a única policy de UPDATE em planejamento_entradas
-- (entradas_update_via_plan, 0010) autoriza por agencia_id — sem branch de
-- cliente_id. Um cliente (current_agencia_id = null) nunca passa na policy →
-- RLS bloqueia o UPDATE → "Erro ao registrar decisão". A migration 0018 adicionou
-- as colunas de aprovação + o CHECK de status, mas esqueceu a policy de UPDATE
-- do cliente.
--
-- Aqui adicionamos a policy de UPDATE escopada por cliente, espelhando o branch
-- de cliente_id da policy de SELECT (entradas_select_via_plan, 0002_rls.sql).
-- Fica OR com a policy existente (admin). A action só grava colunas de aprovação
-- (status, aprovacao_comentario, aprovado_por, aprovado_em).
-- ===========================================================================

drop policy if exists "entradas_update_cliente" on public.planejamento_entradas;
create policy "entradas_update_cliente" on public.planejamento_entradas
  for update using (
    planejamento_id in (
      select id from public.planejamentos
      where cliente_id = public.current_cliente_id(auth.uid())
    )
  );