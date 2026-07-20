-- ===========================================================================
-- 0026_transacao_natureza.sql
-- ===========================================================================
-- Natureza do lançamento financeiro: fixa ou variável.
--   fixa    = custo/receita recorrente e estável (aluguel, salário, mensalidade)
--   variavel = varia mês a mês (anúncios, material, serviço pontual)
-- Nullable + default 'variavel' para compat com transações já existentes.
-- ===========================================================================

alter table public.transacoes
  add column if not exists natureza text default 'variavel'
    check (natureza in ('fixa','variavel'));

-- Retrocompatibilidade: transações antigas (natureza NULL) viram 'variavel'.
update public.transacoes set natureza = 'variavel' where natureza is null;

alter table public.transacoes
  alter column natureza set default 'variavel';

comment on column public.transacoes.natureza is
  'Natureza do lançamento: fixa (recorrente/estável) ou variavel (mês a mês). Default variavel.';