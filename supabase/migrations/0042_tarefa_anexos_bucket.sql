-- ===========================================================================
-- 0042_tarefa_anexos_bucket.sql
-- ===========================================================================
-- Bucket privado `tarefa-anexos` + policies de storage isoladas por
-- agencia_id no path.
--
-- Path convencionado pelo app (lib/actions/tarefa-anexo-actions.ts):
--   {agencia_id}/tarefa/{tarefa_id}/{uuid}-{nome_sanitizado}
--
-- Policy valida:
--   bucket_id = 'tarefa-anexos'
--   AND storage.foldername(name)[1] (a agencia) bate com
--      a agencia do usuario atual (via usuario_e_membro_da_agencia).
--
-- Validacao de MIME/tamanho NAO pode ser feita em policy de storage
-- (Supabase nao suporta). E feita no server action (lib/actions/tarefa-anexo-actions.ts).
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('tarefa-anexos', 'tarefa-anexos', false)
on conflict (id) do nothing;

-- SELECT: usuario autenticado membro da agencia dona do path
drop policy if exists "tarefa_anexos_storage_select" on storage.objects;
create policy "tarefa_anexos_storage_select" on storage.objects
  for select to authenticated using (
    bucket_id = 'tarefa-anexos'
    and public.usuario_e_membro_da_agencia(
      auth.uid(),
      (storage.foldername(name))[1]::uuid
    )
  );

-- INSERT: mesma checagem
drop policy if exists "tarefa_anexos_storage_insert" on storage.objects;
create policy "tarefa_anexos_storage_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'tarefa-anexos'
    and public.usuario_e_membro_da_agencia(
      auth.uid(),
      (storage.foldername(name))[1]::uuid
    )
  );

-- UPDATE: mesma checagem (raro, mas permite sobrescrever metadata)
drop policy if exists "tarefa_anexos_storage_update" on storage.objects;
create policy "tarefa_anexos_storage_update" on storage.objects
  for update to authenticated using (
    bucket_id = 'tarefa-anexos'
    and public.usuario_e_membro_da_agencia(
      auth.uid(),
      (storage.foldername(name))[1]::uuid
    )
  );

-- DELETE: mesma checagem
drop policy if exists "tarefa_anexos_storage_delete" on storage.objects;
create policy "tarefa_anexos_storage_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'tarefa-anexos'
    and public.usuario_e_membro_da_agencia(
      auth.uid(),
      (storage.foldername(name))[1]::uuid
    )
  );
