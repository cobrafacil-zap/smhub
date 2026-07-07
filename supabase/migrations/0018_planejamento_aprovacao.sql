-- 0018: Fluxo de aprovação de planejamentos
-- Adiciona campos de feedback (aprovacao_comentario), registro de quem aprovou
-- e novo status "alteracao_solicitada" no CHECK de status.

-- 1) Colunas novas em planejamento_entradas
alter table public.planejamento_entradas
  add column if not exists aprovacao_comentario text,
  add column if not exists aprovado_por uuid references auth.users(id) on delete set null,
  add column if not exists aprovado_em timestamptz;

-- 2) Estende o CHECK de status. O nome do constraint no 0001_init.sql é
--    gerado automaticamente pelo Postgres: "planejamento_entradas_status_check".
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'planejamento_entradas_status_check'
      and conrelid = 'public.planejamento_entradas'::regclass
  ) then
    alter table public.planejamento_entradas
      drop constraint planejamento_entradas_status_check;
  end if;
end$$;

alter table public.planejamento_entradas
  add constraint planejamento_entradas_status_check
  check (status in ('pendente','aprovado','publicado','rejeitado','alteracao_solicitada'));

-- 3) Comentários de documentação
comment on column public.planejamento_entradas.aprovacao_comentario is
  'Comentário da cliente ao aprovar/recusar/pedir mudança. Obrigatório quando status = alteracao_solicitada.';
comment on column public.planejamento_entradas.aprovado_por is
  'auth.users.id de quem definiu o status (cliente ou admin da agência).';
comment on column public.planejamento_entradas.aprovado_em is
  'Timestamp da última mudança de status de aprovação.';
