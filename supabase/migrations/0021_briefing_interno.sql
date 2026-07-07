-- ===========================================================================
-- 0021_briefing_interno.sql
-- ===========================================================================
-- Marca briefings como "internos" (só admin vê). O briefing preenchido pela
-- agência não deve ser visível ao cliente. A policy de select do cliente passa
-- a excluir os internos.
-- ===========================================================================

alter table public.briefings
  add column if not exists interno boolean not null default false;

comment on column public.briefings.interno is 'Se true, briefing interno da agência — o cliente NÃO vê';

-- Cliente só vê briefings NÃO internos (e vinculados a ele).
drop policy if exists "briefings_select_cliente" on public.briefings;
create policy "briefings_select_cliente" on public.briefings
  for select using (
    cliente_id = public.current_cliente_id(auth.uid())
    and not interno
  );