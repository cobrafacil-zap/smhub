-- ===========================================================================
-- 0009_fix_usuarios_self_select.sql
-- ===========================================================================
-- Adiciona policy que permite o usuário ver o PRÓPRIO registro em `usuarios`.
-- Sem ela, em alguns casos o RLS retorna 0 linhas e a app entra em loop.
-- ===========================================================================

-- Usuário pode ver o próprio registro em `usuarios` (sempre).
-- O SECURITY DEFINER das funções helper já evita recursão.
create policy "usuarios_select_self" on public.usuarios
  for select using (user_id = auth.uid());

-- Idem para `clientes` — útil para o cliente se identificar.
-- (Já existe `clientes_select_self`, mas reforçando.)
drop policy if exists "clientes_select_self" on public.clientes;
create policy "clientes_select_self" on public.clientes
  for select using (user_id = auth.uid());
