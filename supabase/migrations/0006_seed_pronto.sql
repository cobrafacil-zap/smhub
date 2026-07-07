-- =============================================================================
-- PRONTO PARA RODAR — UUIDs já com cast (sem erro de sintaxe)
-- Basta trocar os 2 placeholders pelos UUIDs reais (sem aspas)
-- =============================================================================

-- (1) Cria a agência demo
insert into public.agencias (nome_fantasia, email_contato, status, plano, cor_primaria)
values ('Agência Demonstração', 'contato@agencia.demo', 'ativa', 'pro', '#3D5AFE');

-- (2) Cria o super admin
insert into public.usuarios (user_id, nome, email, role, agencia_id, ativo)
values (
  '00000000-0000-0000-0000-000000000000'::uuid,  -- ← UUID do SUPER ADMIN (sem aspas extras)
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
    '00000000-0000-0000-0000-000000000000'::uuid,  -- ← UUID do ADMIN (sem aspas extras)
    'Admin Demo',
    'admin@agencia.demo',
    'admin_agencia',
    v_agencia_id,
    true
  );

  raise notice 'Admin vinculado à agência %', v_agencia_id;
end $$;
