-- =============================================================================
-- 0006_seed_admin.sql
-- Cria 1 super-admin + 1 agência demo + 1 admin_agencia de exemplo.
--
-- COMO USAR (recomendado):
--   1. No Dashboard do Supabase → Authentication → Users → "Add user":
--        a) superadmin@smhub.com.br  (senha Trocar123!, auto-confirm ON)
--        b) admin@agencia.demo       (senha Trocar123!, auto-confirm ON)
--   2. Em Authentication → Users, copie o UUID de cada um.
--   3. SUBSTITUA os placeholders <SUPER_UUID> e <ADMIN_UUID> abaixo.
--   4. Rode este script no SQL Editor.
-- =============================================================================

-- (1) Cria a agência demo
insert into public.agencias (nome_fantasia, email_contato, status, plano, cor_primaria)
values ('Agência Demonstração', 'contato@agencia.demo', 'ativa', 'pro', '#3D5AFE');

-- (2) Cria o super admin (não vinculado a agência)
insert into public.usuarios (user_id, nome, email, role, agencia_id, ativo)
values (
  '<SUPER_UUID>',                              -- ← cole aqui o UUID do super admin
  'Super Admin',
  'superadmin@smhub.com.br',
  'super_admin',
  null,
  true
);

-- (3) Cria o admin da agência
do $$
declare
  v_agencia_id uuid;
begin
  select id into v_agencia_id
  from public.agencias
  where nome_fantasia = 'Agência Demonstração'
  limit 1;

  insert into public.usuarios (user_id, nome, email, role, agencia_id, ativo)
  values (
    '<ADMIN_UUID>',                            -- ← cole aqui o UUID do admin
    'Admin Demo',
    'admin@agencia.demo',
    'admin_agencia',
    v_agencia_id,
    true
  );

  raise notice 'Admin vinculado à agência %', v_agencia_id;
end $$;

-- =============================================================================
-- OPCIONAL: 1 cliente de exemplo
-- =============================================================================
-- 1. Crie o usuário 'cliente@empresa.demo' (senha Trocar123!) no Dashboard.
-- 2. Copie o UUID e substitua <CLIENTE_UUID> abaixo.
-- 3. Descomente e rode.
/*
do $$
declare
  v_cliente_auth uuid := '<CLIENTE_UUID>';
  v_agencia_id   uuid;
  v_cliente_id   uuid;
begin
  select id into v_agencia_id
  from public.agencias
  where nome_fantasia = 'Agência Demonstração'
  limit 1;

  insert into public.clientes (agencia_id, user_id, nome_empresa, nome_responsavel, status, valor_mensal, dia_vencimento, email)
  values (v_agencia_id, v_cliente_auth, 'Empresa Demo', 'Cliente Demo', 'ativo', 1500.00, 10, 'cliente@empresa.demo')
  returning id into v_cliente_id;

  insert into public.usuarios (user_id, nome, email, role, agencia_id, cliente_id, ativo)
  values (v_cliente_auth, 'Cliente Demo', 'cliente@empresa.demo', 'cliente', v_agencia_id, v_cliente_id, true);
end $$;
*/
