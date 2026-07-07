-- ===========================================================================
-- 0003_storage.sql — Buckets de storage do SM Hub
-- ===========================================================================

-- Habilita RLS nos buckets do storage (recomendação Supabase)
-- Policies por bucket são criadas no dashboard ou em migration adicional.

insert into storage.buckets (id, name, public)
values
  ('agency-assets', 'agency-assets', true),
  ('client-assets', 'client-assets', true),
  ('contracts', 'contracts', false),
  ('briefings', 'briefings', false),
  ('reports', 'reports', false),
  ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Policies mínimas (acesso restrito por pasta agencia_id)
-- Use o dashboard para refinar com políticas que checam user_id/role.

-- Permissão: usuários autenticados podem fazer upload em qualquer bucket
-- Restrinja no app validando agencia_id.
create policy "storage_authenticated_read" on storage.objects
  for select to authenticated using (bucket_id in (
    'agency-assets','client-assets','contracts','briefings','reports','invoices'
  ));

create policy "storage_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id in (
    'agency-assets','client-assets','contracts','briefings','reports','invoices'
  ));

create policy "storage_authenticated_update" on storage.objects
  for update to authenticated using (bucket_id in (
    'agency-assets','client-assets','contracts','briefings','reports','invoices'
  ));

create policy "storage_authenticated_delete" on storage.objects
  for delete to authenticated using (bucket_id in (
    'agency-assets','client-assets','contracts','briefings','reports','invoices'
  ));
