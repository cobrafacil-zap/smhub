import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transacao } from "@/types/database";

export interface ResumoMes {
  receitas: number;
  despesas: number;
  saldo: number;
}

type TransacaoResumo = Pick<Transacao, "valor" | "tipo" | "data_vencimento">;
type FaturaPaga = { valor: number | string; competencia: string };

/**
 * Resumo financeiro do mês corrente — **fonte única** usada tanto pelo
 * Dashboard do admin quanto pela página Financeiro, para os dois sempre
 * baterem o mesmo número.
 *
 *   receitas = transações do tipo "receita" no mês (independe de status)
 *            + faturas PAGAS cuja competência cai no mês
 *   despesas = transações do tipo "despesa" no mês
 *            + custoMensal da equipe ativa (folha fixa — não gera
 *              transação, só é somada ao resumo do mês)
 *   saldo    = receitas - despesas
 *
 * O botão "Marcar paga" atualiza o `status` de uma FATURA; por isso as
 * faturas pagas (por `competencia`) entram aqui — senão o KPI "Receita do
 * mês" do dashboard nunca atualizaria ao marcar uma fatura como paga.
 *
 * O custo da equipe (`usuarios.custo_mensal` dos membros ativos) entra como
 * despesa fixa do mês: reflete a folha da agência sem criar lançamento
 * duplicado no fluxo de caixa (quem quiser registrar editável lança como
 * transação e pode zerar o `custo_mensal` do membro p/ não dobrar).
 */
export function calcularResumo(
  transacoes: TransacaoResumo[],
  faturasPagas: FaturaPaga[],
  ref: Date = new Date(),
  custoEquipeMensal = 0
): ResumoMes {
  const inicioMs = new Date(
    new Date(ref.getFullYear(), ref.getMonth(), 1).toISOString()
  ).getTime();

  const noMes = (data: string | null | undefined) =>
    new Date(data ?? "").getTime() >= inicioMs;

  const receitas =
    transacoes
      .filter((t) => t.tipo === "receita" && noMes(t.data_vencimento))
      .reduce((s, t) => s + Number(t.valor || 0), 0) +
    faturasPagas
      .filter((f) => noMes(f.competencia))
      .reduce((s, f) => s + Number(f.valor || 0), 0);

  const despesas =
    transacoes
      .filter((t) => t.tipo === "despesa" && noMes(t.data_vencimento))
      .reduce((s, t) => s + Number(t.valor || 0), 0) +
    custoEquipeMensal;

  return { receitas, despesas, saldo: receitas - despesas };
}

/** Busca transações + faturas pagas e devolve o resumo do mês corrente. */
export async function calcularResumoMes(
  supabase: SupabaseClient,
  agenciaId: string,
  ref: Date = new Date()
): Promise<ResumoMes> {
  const inicioMesPassado = new Date(
    ref.getFullYear(),
    ref.getMonth() - 5,
    1
  )
    .toISOString()
    .slice(0, 10);

  const [{ data: trans }, { data: fatsPagasRaw }, { data: equipe }] =
    await Promise.all([
      supabase
        .from("transacoes")
        .select("valor, tipo, data_vencimento")
        .eq("agencia_id", agenciaId)
        .gte("data_vencimento", inicioMesPassado),
      supabase
        .from("faturas")
        .select("valor, competencia")
        .eq("agencia_id", agenciaId)
        .eq("status", "pago")
        .gte("competencia", inicioMesPassado),
      // Custo mensal da equipe ativa = folha fixa que entra como despesa do mês.
      supabase
        .from("usuarios")
        .select("custo_mensal")
        .eq("agencia_id", agenciaId)
        .eq("ativo", true),
    ]);

  const custoEquipe = (equipe ?? []).reduce(
    (s, u) => s + Number((u as { custo_mensal?: number | null }).custo_mensal ?? 0),
    0
  );

  return calcularResumo(
    (trans ?? []) as TransacaoResumo[],
    (fatsPagasRaw ?? []) as FaturaPaga[],
    ref,
    custoEquipe
  );
}