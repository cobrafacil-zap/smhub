-- 0043: WhatsApp próprio por agência (Evolution) + mensagens de relatório com IA.
--
-- 1) clientes.whatsapp_group_jid — JID do grupo do cliente (@g.us), editado
--    na aba Informações da ficha do cliente.
-- 2) agencia_whatsapp_conexoes — 1 linha por agência com a config da
--    instância Evolution DEDICADA do SM Hub (api_url/instance + api_key
--    cifrada com AES-256-GCM via lib/crypto, igual aos tokens Meta).
-- 3) relatorio_mensagens — histórico de textos gerados/editados/enviados por
--    relatório (um relatório pode ter várias gerações; o envio marca a usada).

alter table public.clientes
  add column if not exists whatsapp_group_jid text;

create table if not exists public.agencia_whatsapp_conexoes (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null unique references public.agencias(id) on delete cascade,
  api_url text not null,
  instance text not null,
  api_key_ciphertext text not null,
  api_key_iv text not null,
  api_key_tag text not null,
  status text not null default 'desconectado',
  connected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.relatorio_mensagens (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid not null references public.relatorios(id) on delete cascade,
  agencia_id uuid not null references public.agencias(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  texto text not null,
  modelo text not null default 'gemini-1.5-flash',
  gerado_por uuid references public.usuarios(id) on delete set null,
  enviado_em timestamptz,
  enviado_para text,
  mensagem_id text,
  created_at timestamptz default now()
);
create index if not exists idx_relatorio_mensagens_relatorio
  on public.relatorio_mensagens(relatorio_id, created_at desc);

alter table public.agencia_whatsapp_conexoes enable row level security;
alter table public.relatorio_mensagens enable row level security;

-- Leitura: mesma agência ou super-admin (padrão 0002_rls).
create policy "wppconn_select_agencia" on public.agencia_whatsapp_conexoes
  for select using (agencia_id = public.current_agencia_id(auth.uid()));
create policy "wppconn_select_super" on public.agencia_whatsapp_conexoes
  for select using (public.is_super_admin(auth.uid()));

create policy "relmsg_select_agencia" on public.relatorio_mensagens
  for select using (agencia_id = public.current_agencia_id(auth.uid()));
create policy "relmsg_select_cliente" on public.relatorio_mensagens
  for select using (cliente_id = public.current_cliente_id(auth.uid()));
create policy "relmsg_select_super" on public.relatorio_mensagens
  for select using (public.is_super_admin(auth.uid()));

-- Escrita da conexão: membro da agência (o server action exige admin).
create policy "wppconn_write_agencia" on public.agencia_whatsapp_conexoes
  for all using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  ) with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- Escrita das mensagens: membro da agência.
create policy "relmsg_insert_agencia" on public.relatorio_mensagens
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "relmsg_update_agencia" on public.relatorio_mensagens
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
create policy "relmsg_delete_agencia" on public.relatorio_mensagens
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
