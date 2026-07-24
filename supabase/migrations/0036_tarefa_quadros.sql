-- ===========================================================================
-- 0036_tarefa_quadros.sql
-- ===========================================================================
-- Multi-board no kanban de tarefas. Cada agência pode ter vários quadros
-- (ex: "Quadro geral", "Design", "Conteúdo"). Tarefas pertencem a UM
-- quadro (`tarefas.quadro_id`). Colunas (status) continuam compartilhadas
-- entre os quadros — customização por quadro é fase futura.
--
-- Backfill: pra cada agência, garante um "Quadro geral" (cria se não houver)
-- e aponta as tarefas existentes pra ele. Roda tudo em uma transação
-- implícita; a constraint NOT NULL só é aplicada depois do backfill.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabela de quadros
-- ---------------------------------------------------------------------------
create table if not exists public.tarefa_quadros (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  descricao text,
  ordem integer not null default 0,
  created_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tarefa_quadros_agencia_ordem
  on public.tarefa_quadros (agencia_id, ordem, created_at);

-- ---------------------------------------------------------------------------
-- 2) Coluna quadro_id em tarefas (NOT NULL após backfill)
-- ---------------------------------------------------------------------------
alter table public.tarefas
  add column if not exists quadro_id uuid references public.tarefa_quadros(id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 3) Backfill: garante 1 "Quadro geral" por agência e move tarefas pra ele.
--    Idempotente: se já existir, só preenche tarefas com quadro_id nulo.
-- ---------------------------------------------------------------------------
do $$
declare
  ag record;
  qid uuid;
begin
  for ag in select id from public.agencias loop
    select id into qid
    from public.tarefa_quadros
    where agencia_id = ag.id
    order by created_at asc
    limit 1;
    if qid is null then
      insert into public.tarefa_quadros (agencia_id, nome, ordem)
        values (ag.id, 'Quadro geral', 0)
        returning id into qid;
    end if;
    update public.tarefas
      set quadro_id = qid
      where agencia_id = ag.id and quadro_id is null;
  end loop;
end$$;

alter table public.tarefas alter column quadro_id set not null;
create index if not exists idx_tarefas_agencia_quadro
  on public.tarefas (agencia_id, quadro_id);

-- ---------------------------------------------------------------------------
-- 4) Trigger de updated_at (reutiliza a função tg_touch_updated_at se já
--    existir de outra migration; senão cria). Idempotente via
--    create or replace.
-- ---------------------------------------------------------------------------
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end$$;

drop trigger if exists trg_tarefa_quadros_touch on public.tarefa_quadros;
create trigger trg_tarefa_quadros_touch
  before update on public.tarefa_quadros
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5) RLS (mesmo padrão de tarefas: is_agencia_member + current_agencia_id)
-- ---------------------------------------------------------------------------
alter table public.tarefa_quadros enable row level security;

drop policy if exists "tarefa_quadros_select_agencia" on public.tarefa_quadros;
create policy "tarefa_quadros_select_agencia" on public.tarefa_quadros
  for select using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_quadros_select_super" on public.tarefa_quadros;
create policy "tarefa_quadros_select_super" on public.tarefa_quadros
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "tarefa_quadros_insert_agencia" on public.tarefa_quadros;
create policy "tarefa_quadros_insert_agencia" on public.tarefa_quadros
  for insert with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_quadros_update_agencia" on public.tarefa_quadros;
create policy "tarefa_quadros_update_agencia" on public.tarefa_quadros
  for update using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  )
  with check (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );

drop policy if exists "tarefa_quadros_delete_agencia" on public.tarefa_quadros;
create policy "tarefa_quadros_delete_agencia" on public.tarefa_quadros
  for delete using (
    agencia_id = public.current_agencia_id(auth.uid())
    and public.is_agencia_member(auth.uid())
  );
