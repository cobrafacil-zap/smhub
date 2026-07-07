-- ===========================================================================
-- 0008_allow_usuarios_insert_update.sql
-- ===========================================================================
-- Necessário para que o admin_agencia possa:
--   1) Criar usuários com role='cliente' (vincular cliente ao auth)
--   2) Atualizar o user_id de um cliente após convite
--   3) Resetar a senha via Admin API (não passa por RLS, mas a checagem
--      de "pode criar usuário para esta agência" precisa de policy INSERT)
--
-- Por padrão, sem policy de INSERT, o RLS bloqueia novos usuários mesmo
-- que o admin seja o dono da agência.
-- ===========================================================================

-- ADMIN pode inserir usuários da própria agência
create policy "usuarios_insert_agencia" on public.usuarios
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ADMIN pode atualizar usuários da própria agência (reativar, mudar cargo)
create policy "usuarios_update_agencia" on public.usuarios
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- ADMIN pode atualizar o `user_id` de um cliente (vincular após convite)
create policy "clientes_update_agencia" on public.clientes
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- Cliente pode atualizar apenas o próprio perfil (nome, telefone, avatar)
create policy "clientes_update_self" on public.clientes
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Cliente pode atualizar o próprio registro em `usuarios` (nome, telefone, senha não vai aqui)
create policy "usuarios_update_self" on public.usuarios
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
