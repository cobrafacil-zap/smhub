-- ===========================================================================
-- 0037_transacao_parcelas.sql
-- ===========================================================================
-- Parcelamento de transações: uma transação "pai" (1/N) + N-1 filhas (i/N
-- pra i=2..N). Todas geradas a partir de uma data base com vencimento
-- mensal. Cada parcela é uma transação independente (pode ser marcada
-- paga, editada, excluída individualmente); excluir a pai cascade-apaga
-- todas as filhas.
--
-- Colunas adicionadas (todas nullable = "não parcelado"):
--   parcela_atual    int  — 1..N
--   parcela_total    int  — N
--   transacao_pai_id uuid — FK para a parcela 1/N
--
-- RLS não muda: a policy de transacoes já filtra por agencia_id.
-- ===========================================================================

alter table public.transacoes
  add column if not exists parcela_atual integer
    check (parcela_atual is null or (parcela_atual between 1 and 999)),
  add column if not exists parcela_total integer
    check (parcela_total is null or (parcela_total between 1 and 999)),
  add column if not exists transacao_pai_id uuid
    references public.transacoes(id) on delete cascade;

-- Sanidade: ou nenhum dos campos de parcela tá preenchido, ou todos estão
-- (e parcela_atual <= parcela_total).
alter table public.transacoes
  drop constraint if exists transacoes_parcela_coerente;
alter table public.transacoes
  add constraint transacoes_parcela_coerente
  check (
    (parcela_atual is null and parcela_total is null and transacao_pai_id is null)
    or
    (parcela_atual is not null and parcela_total is not null
     and parcela_atual <= parcela_total)
  );

-- Índice pra buscar parcelas filhas de uma pai rapidamente (e pra
-- "excluir todas" via DELETE WHERE transacao_pai_id = X).
create index if not exists idx_transacoes_pai
  on public.transacoes (transacao_pai_id)
  where transacao_pai_id is not null;

-- Comentários.
comment on column public.transacoes.parcela_atual is
  'Se parcelado, número desta parcela (1..N). NULL = transação única.';
comment on column public.transacoes.parcela_total is
  'Se parcelado, total de parcelas (N). NULL = transação única.';
comment on column public.transacoes.transacao_pai_id is
  'ID da transação "pai" (parcela 1/N). Filhas têm este campo preenchido. ON DELETE CASCADE.';
