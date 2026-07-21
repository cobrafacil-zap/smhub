-- ===========================================================================
-- 0029_equipe_supervisor.sql
-- ===========================================================================
-- Organograma da equipe: cada membro pode ter um supervisor (a quem responde).
-- FK auto-referencial em usuarios. Estrutural/reporte — não afeta permissões
-- (permissões continuam por papel: admin_agencia vs membro_equipe).
-- ===========================================================================

alter table public.usuarios
  add column if not exists supervisor_id uuid references public.usuarios(id) on delete set null;

comment on column public.usuarios.supervisor_id is 'usuarios.id do supervisor direto (organograma). Nullable.';

create index if not exists idx_usuarios_supervisor on public.usuarios(supervisor_id);