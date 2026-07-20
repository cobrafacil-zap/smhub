-- ===========================================================================
-- 0024_platform_config.sql
-- ===========================================================================
-- Configuração global da plataforma (singleton). Hoje guarda as logos da
-- plataforma para os modos claro/escuro, configuráveis pelo super-admin no
-- painel de Configurações. Aparece em todo o site via <Logo>.
-- ===========================================================================

create table if not exists public.platform_config (
  id text primary key default 'singleton',
  logo_url_light text,
  logo_url_dark text,
  updated_at timestamptz default now()
);

-- Garante que exista sempre uma (única) linha de configuração.
insert into public.platform_config (id) values ('singleton')
on conflict (id) do nothing;

-- Habilita RLS
alter table public.platform_config enable row level security;

-- Super-admin pode tudo
create policy "platform_config_all_super" on public.platform_config
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- Qualquer um pode ler (a logo precisa aparecer em landing/login/checkout etc.)
create policy "platform_config_select_all" on public.platform_config
  for select using (true);

-- Trigger updated_at
create trigger trg_platform_config_updated_at
  before update on public.platform_config
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- Bucket público para assets da plataforma (logos claro/escuro etc.)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('platform-assets', 'platform-assets', true)
on conflict (id) do nothing;

-- Estende as policies de storage existentes (0003_storage.sql) para incluir
-- o novo bucket. O acesso é validado no app (super-admin only na rota de upload).
drop policy if exists "storage_authenticated_read" on storage.objects;
create policy "storage_authenticated_read" on storage.objects
  for select to authenticated using (bucket_id in (
    'agency-assets','client-assets','contracts','briefings','reports','invoices','platform-assets'
  ));

drop policy if exists "storage_authenticated_insert" on storage.objects;
create policy "storage_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id in (
    'agency-assets','client-assets','contracts','briefings','reports','invoices','platform-assets'
  ));

drop policy if exists "storage_authenticated_update" on storage.objects;
create policy "storage_authenticated_update" on storage.objects
  for update to authenticated using (bucket_id in (
    'agency-assets','client-assets','contracts','briefings','reports','invoices','platform-assets'
  ));

drop policy if exists "storage_authenticated_delete" on storage.objects;
create policy "storage_authenticated_delete" on storage.objects
  for delete to authenticated using (bucket_id in (
    'agency-assets','client-assets','contracts','briefings','reports','invoices','platform-assets'
  ));