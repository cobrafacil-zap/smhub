-- ===========================================================================
-- 0007_fix_super_admin.sql — Conserta o super-admin
-- ===========================================================================
-- Problema: o super-admin foi cadastrado em `usuarios` (com agencia_id=null),
-- mas a RLS usa `is_super_admin(uid)` que consulta a tabela `super_admins`.
-- Resultado: o RLS não enxerga o super-admin e o dashboard fica travado.
--
-- Esta migration:
--   1. Move o super-admin de `usuarios` para `super_admins`
--   2. Mantém a referência user_id única
-- ===========================================================================

-- 1) Insere em super_admins todos os usuarios com role='super_admin' que
--    ainda não estão lá. Usa o e-mail para deduplicar.
insert into public.super_admins (user_id, nome, email, ativo)
select user_id, nome, email, ativo
from public.usuarios
where role = 'super_admin'
on conflict (user_id) do nothing;

-- 2) Remove de `usuarios` os registros com role='super_admin' (eles só devem
--    existir em `super_admins`).
delete from public.usuarios where role = 'super_admin';
