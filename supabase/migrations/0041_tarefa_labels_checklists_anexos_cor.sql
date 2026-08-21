-- ===========================================================================
-- 0041_tarefa_labels_checklists_anexos_cor.sql
-- ===========================================================================
-- Pacote de features Trello-style pro kanban de tarefas:
--   1) `tarefa_labels` + `tarefa_label_vinculos` (N-N com tarefas).
--   2) `tarefa_checklists` + `tarefa_checklist_itens` (com drag dos itens).
--   3) `tarefa_anexos` (referência; o arquivo vai pro storage bucket).
--   4) `tarefa_colunas.cor` (cor de capa por coluna).
--   5) `tarefas.ordem` muda de integer pra numeric(20,10) — habilita drag
--      fracionário estilo Trello (sem truncamento). Backfill inicial com
--      passo 1024 pra deixar folga pra inserts futuros.
--
-- Mudanças estruturais (precisam vir ANTES das tabelas que dependem):
--   a) ALTER tarefas.ordem TYPE numeric(20,10).
--   b) Backfill de ordem particionado por coluna (preserva created_at).
--   c) Índice composto (tarefa_coluna_id, ordem).
--   d) Helper SQL `usuario_e_membro_da_agencia(uid, aid)` — usado pelas
--      policies do storage na migration 0042 (anexos por path).
--
-- RPCs criadas no final (reaproveitáveis pelas actions):
--   - renumerar_ordem_tarefas_coluna(coluna_id uuid)
--   - renumerar_ordem_colunas_quadro(quadro_id uuid)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0) Helper local: checa se um usuario pertence a uma agencia específica.
--    Diferente de `is_agencia_member` (que olha a agencia atual do usuario),
--    essa recebe a agencia como argumento. Usada pelas policies de storage
--    da migration 0042, que precisam validar a agencia do PATH do arquivo.
-- ---------------------------------------------------------------------------
create or replace function public.usuario_e_membro_da_agencia(uid uuid, aid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where user_id = uid and agencia_id = aid and ativo = true
  );
$$;

-- ---------------------------------------------------------------------------
-- 1) `tarefas.ordem` int -> numeric(20,10)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tarefas'
      and column_name = 'ordem'
      and data_type = 'integer'
  ) then
    alter table public.tarefas
      alter column ordem type numeric(20,10) using ordem::numeric(20,10);
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2) Backfill inicial de ordem (somente onde ainda for 0).
--    Agrupa por coluna e atribui 1024, 2048, 3072... preservando created_at.
--    Roda só nas tarefas com ordem zero pra não sobrescrever posições
--    manuais já existentes (caso o app tenha escrito alguma).
-- ---------------------------------------------------------------------------
with ranked as (
  select id, row_number() over (
    partition by tarefa_coluna_id order by created_at
  ) * 1024 as nova_ordem
  from public.tarefas
  where ordem = 0
)
update public.tarefas t
   set ordem = r.nova_ordem
  from ranked r
 where t.id = r.id;

-- ---------------------------------------------------------------------------
-- 3) Índice composto pra acelerar ORDER BY do kanban
-- ---------------------------------------------------------------------------
create index if not exists idx_tarefas_coluna_ordem
  on public.tarefas (tarefa_coluna_id, ordem);

-- ---------------------------------------------------------------------------
-- 4) cor em tarefa_colunas (cor de capa por coluna)
-- ---------------------------------------------------------------------------
alter table public.tarefa_colunas
  add column if not exists cor text;

-- ---------------------------------------------------------------------------
-- 5) tarefa_labels (catálogo por agência)
-- ---------------------------------------------------------------------------
create table if not exists public.tarefa_labels (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  nome text not null check (char_length(trim(nome)) between 1 and 40),
  -- Cor em hex (#RRGGBB). Sem CHECK — o app valida formato na action.
  cor text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agencia_id, nome)
);

create index if not exists idx_tarefa_labels_agencia
  on public.tarefa_labels (agencia_id, ordem, nome);

drop trigger if exists trg_tarefa_labels_touch on public.tarefa_labels;
create trigger trg_tarefa_labels_touch
  before update on public.tarefa_labels
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6) tarefa_label_vinculos (N-N)
--    RLS precisa garantir que TANTO a tarefa QUANTO o label pertencem à
--    agencia atual — senao um admin cross-agency injeta label alheio.
-- ---------------------------------------------------------------------------
create table if not exists public.tarefa_label_vinculos (
  tarefa_id uuid references public.tarefas(id) on delete cascade not null,
  label_id  uuid references public.tarefa_labels(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (tarefa_id, label_id)
);

create index if not exists idx_tarefa_label_vinculos_label
  on public.tarefa_label_vinculos (label_id);

create index if not exists idx_tarefa_label_vinculos_tarefa
  on public.tarefa_label_vinculos (tarefa_id);

-- ---------------------------------------------------------------------------
-- 7) tarefa_checklists
-- ---------------------------------------------------------------------------
create table if not exists public.tarefa_checklists (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid references public.tarefas(id) on delete cascade not null,
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tarefa_checklists_tarefa
  on public.tarefa_checklists (tarefa_id, ordem);

drop trigger if exists trg_tarefa_checklists_touch on public.tarefa_checklists;
create trigger trg_tarefa_checklists_touch
  before update on public.tarefa_checklists
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 8) tarefa_checklist_itens
--    ordem numeric(20,10) pra permitir drag fracionário igual o das tarefas.
-- ---------------------------------------------------------------------------
create table if not exists public.tarefa_checklist_itens (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid references public.tarefa_checklists(id) on delete cascade not null,
  texto text not null check (char_length(trim(texto)) between 1 and 300),
  concluido boolean not null default false,
  ordem numeric(20,10) not null default 1024,
  created_at timestamptz not null default now()
);

create index if not exists idx_tarefa_checklist_itens_checklist
  on public.tarefa_checklist_itens (checklist_id, ordem);

-- ---------------------------------------------------------------------------
-- 9) tarefa_anexos (referência; arquivo fica no storage)
-- ---------------------------------------------------------------------------
create table if not exists public.tarefa_anexos (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid references public.tarefas(id) on delete cascade not null,
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  nome_original text not null check (char_length(trim(nome_original)) between 1 and 200),
  path text not null,
  mime text,
  tamanho integer,
  uploaded_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tarefa_anexos_tarefa
  on public.tarefa_anexos (tarefa_id, created_at desc);

create index if not exists idx_tarefa_anexos_agencia
  on public.tarefa_anexos (agencia_id);

-- ===========================================================================
-- RLS
-- ===========================================================================

-- tarefa_labels -------------------------------------------------------
alter table public.tarefa_labels enable row level security;

drop policy if exists "tarefa_labels_select_agencia" on public.tarefa_labels;
create policy "tarefa_labels_select_agencia" on public.tarefa_labels
  for select using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_labels_select_super" on public.tarefa_labels;
create policy "tarefa_labels_select_super" on public.tarefa_labels
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "tarefa_labels_insert_agencia" on public.tarefa_labels;
create policy "tarefa_labels_insert_agencia" on public.tarefa_labels
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_labels_update_agencia" on public.tarefa_labels;
create policy "tarefa_labels_update_agencia" on public.tarefa_labels
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  )
  with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_labels_delete_agencia" on public.tarefa_labels;
create policy "tarefa_labels_delete_agencia" on public.tarefa_labels
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

-- tarefa_label_vinculos (policy cruzada — tarefa E label mesma agencia) ---
alter table public.tarefa_label_vinculos enable row level security;

drop policy if exists "tarefa_label_vinculos_select_agencia" on public.tarefa_label_vinculos;
create policy "tarefa_label_vinculos_select_agencia" on public.tarefa_label_vinculos
  for select using (
    exists (
      select 1 from public.tarefas t
      join public.tarefa_labels l on l.id = tarefa_label_vinculos.label_id
      where t.id = tarefa_label_vinculos.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and l.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_label_vinculos_select_super" on public.tarefa_label_vinculos;
create policy "tarefa_label_vinculos_select_super" on public.tarefa_label_vinculos
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "tarefa_label_vinculos_insert_agencia" on public.tarefa_label_vinculos;
create policy "tarefa_label_vinculos_insert_agencia" on public.tarefa_label_vinculos
  for insert with check (
    exists (
      select 1 from public.tarefas t
      join public.tarefa_labels l on l.id = tarefa_label_vinculos.label_id
      where t.id = tarefa_label_vinculos.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and l.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_label_vinculos_delete_agencia" on public.tarefa_label_vinculos;
create policy "tarefa_label_vinculos_delete_agencia" on public.tarefa_label_vinculos
  for delete using (
    exists (
      select 1 from public.tarefas t
      join public.tarefa_labels l on l.id = tarefa_label_vinculos.label_id
      where t.id = tarefa_label_vinculos.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and l.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

-- tarefa_checklists (policy via EXISTS em tarefas) --------------------
alter table public.tarefa_checklists enable row level security;

drop policy if exists "tarefa_checklists_select_agencia" on public.tarefa_checklists;
create policy "tarefa_checklists_select_agencia" on public.tarefa_checklists
  for select using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_checklists.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_checklists_select_super" on public.tarefa_checklists;
create policy "tarefa_checklists_select_super" on public.tarefa_checklists
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "tarefa_checklists_insert_agencia" on public.tarefa_checklists;
create policy "tarefa_checklists_insert_agencia" on public.tarefa_checklists
  for insert with check (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_checklists.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_checklists_update_agencia" on public.tarefa_checklists;
create policy "tarefa_checklists_update_agencia" on public.tarefa_checklists
  for update using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_checklists.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_checklists.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_checklists_delete_agencia" on public.tarefa_checklists;
create policy "tarefa_checklists_delete_agencia" on public.tarefa_checklists
  for delete using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_checklists.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

-- tarefa_checklist_itens (policy via EXISTS em checklists -> tarefas) ---
alter table public.tarefa_checklist_itens enable row level security;

drop policy if exists "tarefa_checklist_itens_select_agencia" on public.tarefa_checklist_itens;
create policy "tarefa_checklist_itens_select_agencia" on public.tarefa_checklist_itens
  for select using (
    exists (
      select 1 from public.tarefa_checklists c
      join public.tarefas t on t.id = c.tarefa_id
      where c.id = tarefa_checklist_itens.checklist_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_checklist_itens_select_super" on public.tarefa_checklist_itens;
create policy "tarefa_checklist_itens_select_super" on public.tarefa_checklist_itens
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "tarefa_checklist_itens_insert_agencia" on public.tarefa_checklist_itens;
create policy "tarefa_checklist_itens_insert_agencia" on public.tarefa_checklist_itens
  for insert with check (
    exists (
      select 1 from public.tarefa_checklists c
      join public.tarefas t on t.id = c.tarefa_id
      where c.id = tarefa_checklist_itens.checklist_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_checklist_itens_update_agencia" on public.tarefa_checklist_itens;
create policy "tarefa_checklist_itens_update_agencia" on public.tarefa_checklist_itens
  for update using (
    exists (
      select 1 from public.tarefa_checklists c
      join public.tarefas t on t.id = c.tarefa_id
      where c.id = tarefa_checklist_itens.checklist_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.tarefa_checklists c
      join public.tarefas t on t.id = c.tarefa_id
      where c.id = tarefa_checklist_itens.checklist_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_checklist_itens_delete_agencia" on public.tarefa_checklist_itens;
create policy "tarefa_checklist_itens_delete_agencia" on public.tarefa_checklist_itens
  for delete using (
    exists (
      select 1 from public.tarefa_checklists c
      join public.tarefas t on t.id = c.tarefa_id
      where c.id = tarefa_checklist_itens.checklist_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

-- tarefa_anexos (policy via EXISTS em tarefas) -----------------------
alter table public.tarefa_anexos enable row level security;

drop policy if exists "tarefa_anexos_select_agencia" on public.tarefa_anexos;
create policy "tarefa_anexos_select_agencia" on public.tarefa_anexos
  for select using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_anexos.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_anexos_select_super" on public.tarefa_anexos;
create policy "tarefa_anexos_select_super" on public.tarefa_anexos
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "tarefa_anexos_insert_agencia" on public.tarefa_anexos;
create policy "tarefa_anexos_insert_agencia" on public.tarefa_anexos
  for insert with check (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_anexos.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_anexos_update_agencia" on public.tarefa_anexos;
create policy "tarefa_anexos_update_agencia" on public.tarefa_anexos
  for update using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_anexos.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_anexos.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

drop policy if exists "tarefa_anexos_delete_agencia" on public.tarefa_anexos;
create policy "tarefa_anexos_delete_agencia" on public.tarefa_anexos
  for delete using (
    exists (
      select 1 from public.tarefas t
      where t.id = tarefa_anexos.tarefa_id
        and t.agencia_id = public.current_agencia_id(auth.uid())
        and public.is_agencia_member(auth.uid())
    )
  );

-- ===========================================================================
-- RPCs de renumeração (chamadas pelas actions quando ha colisão de precisao)
-- ===========================================================================

-- Renumera TODAS as tarefas de uma coluna com passo 1024 (1, 1024, 2048...).
-- Seguro de chamar várias vezes; idempotente.
create or replace function public.renumerar_ordem_tarefas_coluna(coluna_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with ranked as (
    select id, row_number() over (order by ordem, created_at) * 1024 as nova_ordem
    from public.tarefas
    where tarefa_coluna_id = coluna_id
  )
  update public.tarefas t
     set ordem = r.nova_ordem
    from ranked r
   where t.id = r.id;
end$$;

-- Renumera TODAS as colunas de um quadro com passo 1024.
create or replace function public.renumerar_ordem_colunas_quadro(quadro_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with ranked as (
    select id, row_number() over (order by ordem, created_at) * 1024 as nova_ordem
    from public.tarefa_colunas
    where quadro_id = quadro_id and not arquivada
  )
  update public.tarefa_colunas c
     set ordem = r.nova_ordem
    from ranked r
   where c.id = r.id;
end$$;
