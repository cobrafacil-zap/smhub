-- ===========================================================================
-- 0010_admin_insert_update_policies.sql
-- ===========================================================================
-- As policies originais (0002) só tinham SELECT. Sem policy de INSERT,
-- qualquer INSERT via Supabase client (cookie-based) é BLOQUEADO pelo RLS,
-- mesmo que o usuário seja o admin da agência.
--
-- Esta migration adiciona INSERT/UPDATE/DELETE para o admin em todas as
-- tabelas que ele precisa operar.
-- ===========================================================================

-- ===========================================================================
-- CLIENTES
-- ===========================================================================
create policy "clientes_insert_agencia" on public.clientes
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ===========================================================================
-- USUARIOS — INSERT de equipe (admin_agencia pode adicionar membros)
-- ===========================================================================
-- Já existe da 0008. Reforçando:
drop policy if exists "usuarios_insert_agencia" on public.usuarios;
create policy "usuarios_insert_agencia" on public.usuarios
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ===========================================================================
-- PLANEJAMENTOS
-- ===========================================================================
create policy "plan_insert_agencia" on public.planejamentos
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "plan_update_agencia" on public.planejamentos
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "plan_delete_agencia" on public.planejamentos
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ===========================================================================
-- ENTRADAS DO PLANEJAMENTO
-- ===========================================================================
create policy "entradas_insert_via_plan" on public.planejamento_entradas
  for insert with check (
    planejamento_id in (
      select id from public.planejamentos
      where agencia_id = public.current_agencia_id(auth.uid())
    )
    or public.is_super_admin(auth.uid())
  );
create policy "entradas_update_via_plan" on public.planejamento_entradas
  for update using (
    planejamento_id in (
      select id from public.planejamentos
      where agencia_id = public.current_agencia_id(auth.uid())
    )
    or public.is_super_admin(auth.uid())
  );
create policy "entradas_delete_via_plan" on public.planejamento_entradas
  for delete using (
    planejamento_id in (
      select id from public.planejamentos
      where agencia_id = public.current_agencia_id(auth.uid())
    )
    or public.is_super_admin(auth.uid())
  );

-- ===========================================================================
-- RELATÓRIOS
-- ===========================================================================
create policy "relat_insert_agencia" on public.relatorios
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "relat_update_agencia" on public.relatorios
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "relat_delete_agencia" on public.relatorios
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ===========================================================================
-- MÉTRICAS DIÁRIAS (vinculadas a relatório)
-- ===========================================================================
create policy "metricas_insert_via_relat" on public.relatorio_metricas_diarias
  for insert with check (
    relatorio_id in (
      select id from public.relatorios
      where agencia_id = public.current_agencia_id(auth.uid())
    )
    or public.is_super_admin(auth.uid())
  );
create policy "metricas_update_via_relat" on public.relatorio_metricas_diarias
  for update using (
    relatorio_id in (
      select id from public.relatorios
      where agencia_id = public.current_agencia_id(auth.uid())
    )
    or public.is_super_admin(auth.uid())
  );
create policy "metricas_delete_via_relat" on public.relatorio_metricas_diarias
  for delete using (
    relatorio_id in (
      select id from public.relatorios
      where agencia_id = public.current_agencia_id(auth.uid())
    )
    or public.is_super_admin(auth.uid())
  );

-- ===========================================================================
-- TRANSAÇÕES
-- ===========================================================================
create policy "transacoes_insert_agencia" on public.transacoes
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "transacoes_update_agencia" on public.transacoes
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "transacoes_delete_agencia" on public.transacoes
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ===========================================================================
-- FATURAS
-- ===========================================================================
create policy "faturas_insert_agencia" on public.faturas
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "faturas_update_agencia" on public.faturas
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "faturas_delete_agencia" on public.faturas
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ===========================================================================
-- CONTRATOS
-- ===========================================================================
create policy "contratos_insert_agencia" on public.contratos
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "contratos_update_agencia" on public.contratos
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "contratos_delete_agencia" on public.contratos
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ===========================================================================
-- CONTRATO TEMPLATES (admin pode criar templates da própria agência)
-- ===========================================================================
create policy "templates_insert_agencia" on public.contrato_templates
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "templates_update_agencia" on public.contrato_templates
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "templates_delete_agencia" on public.contrato_templates
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ===========================================================================
-- BRIEFINGS
-- ===========================================================================
create policy "briefings_insert_agencia" on public.briefings
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "briefings_update_agencia" on public.briefings
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "briefings_delete_agencia" on public.briefings
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ===========================================================================
-- DATAS COMEMORATIVAS — leitura pública, mas escrita precisa de admin
-- ===========================================================================
create policy "datas_insert_admin" on public.datas_comemorativas
  for insert with check (public.is_agencia_member(auth.uid()));
create policy "datas_update_admin" on public.datas_comemorativas
  for update using (public.is_agencia_member(auth.uid()));
create policy "datas_delete_admin" on public.datas_comemorativas
  for delete using (public.is_agencia_member(auth.uid()));
