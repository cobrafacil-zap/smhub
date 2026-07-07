-- ===========================================================================
-- 0022_datas_comemorativas_agencia.sql
-- ===========================================================================
-- Torna `datas_comemorativas` multi-tenant: linhas com agencia_id NULL são
-- globais/compartilhadas (ex.: feriados do seed 0004); linhas com agencia_id
-- preenchido pertencem à agência (criadas manualmente ou via upload de CSV).
-- O admin da agência vê globals + as suas, e só mexe nas suas.
-- ===========================================================================

alter table public.datas_comemorativas
  add column if not exists agencia_id uuid references public.agencias(id) on delete cascade;

create index if not exists idx_datas_comem_agencia
  on public.datas_comemorativas(agencia_id);

-- SELECT: agência vê globals (null) + as suas; super-admin vê tudo.
drop policy if exists "datas_select_agencia" on public.datas_comemorativas;
create policy "datas_select_agencia" on public.datas_comemorativas
  for select using (
    agencia_id is null
    or agencia_id = public.current_agencia_id(auth.uid())
    or public.is_super_admin(auth.uid())
  );

-- INSERT: só na própria agência.
create policy "datas_insert_agencia" on public.datas_comemorativas
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- UPDATE/DELETE: só nas próprias.
create policy "datas_update_agencia" on public.datas_comemorativas
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

create policy "datas_delete_agencia" on public.datas_comemorativas
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );