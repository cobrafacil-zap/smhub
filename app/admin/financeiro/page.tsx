import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { Wallet, TrendingUp, TrendingDown, Plus, FileText, Zap, Users, UserCog, ArrowRight } from "lucide-react";
import { FATURA_STATUS } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import { FinanceChartClient as FinanceChart } from "@/components/finance/FinanceChartClient";
import { MarcarFaturaPagaButton } from "./MarcarFaturaPagaButton";
import { ExcluirTransacaoButton } from "./ExcluirTransacaoButton";
import { EditarTransacaoButton } from "./EditarTransacaoButton";
import { FiltroPeriodo } from "./FiltroPeriodo";
import { gerarFaturasMesAction } from "@/lib/actions/fatura-briefing-actions";
import type { Cliente, Fatura, Transacao } from "@/types/database";

export const metadata = { title: "Financeiro" };

// Wrapper server-action em escopo de MÓDULO pro form "Gerar mensais" (não
// fecha sobre variáveis do render; retorna Promise<void> = compatível com o
// prop `action`). O "Marcar paga" usa um Client Component com toast.
async function gerarMensaisAction(fd: FormData) {
  "use server";
  await gerarFaturasMesAction(fd);
}

// PERF: cacheia as 3 queries de dados do Financeiro em memória (60s). Repetições
// de navegação com a mesma janela de meses saem do cache em vez de 3 round-trips
// ao DB. A chave é (aid, inicioISO, fimISO) — o toggle "Só pago" NÃO entra na
// chave porque ele só filtra no pós-processamento (as queries trazem todos os
// status). Invalidado por `revalidateTag("financeiro-data")` nas mutações de
// transação/fatura (ver lib/actions) — além do TTL de 60s.
const loadFinanceiroData = unstable_cache(
  async (aid: string, inicioISO: string, fimISO: string) => {
    const supabase = createAdminClient();
    const [{ data: trans }, { data: fats }, { data: equipeAtiva }] = await Promise.all([
      supabase
        .from("transacoes")
        .select("id, descricao, categoria, tipo, valor, data_vencimento, natureza, status")
        .eq("agencia_id", aid)
        .gte("data_vencimento", inicioISO)
        .lt("data_vencimento", fimISO)
        .order("data_vencimento", { ascending: false }),
      supabase
        .from("faturas")
        .select("id, numero, competencia, data_vencimento, valor, status, cliente:clientes(nome_empresa)")
        .eq("agencia_id", aid)
        .gte("competencia", inicioISO)
        .lt("competencia", fimISO)
        .order("data_vencimento", { ascending: false })
        .limit(500),
      supabase
        .from("usuarios")
        .select("id, nome, email, cargo, custo_mensal, ativo")
        .eq("agencia_id", aid)
        .eq("ativo", true)
        .order("custo_mensal", { ascending: false, nullsFirst: false }),
    ]);
    return { trans, fats, equipeAtiva };
  },
  ["financeiro-data-v1"],
  { revalidate: 60, tags: ["financeiro-data"] }
);

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams?: { meses?: string; realizado?: string };
}) {
  const session = await requireAgenciaMember();
  // As leituras de dados rodam dentro de loadFinanceiroData (unstable_cache),
  // que usa o client service-role (bypassa RLS) e filtra por .eq("agencia_id",
  // aid). aid vem de requireAgenciaMember, que validou a sessão.
  const aid = session.profile.agencia_id!;

  const today = new Date();
  const mesAtualKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  // Filtros da página (via URL):
  //   meses     — lista de YYYY-MM selecionados LIVREMENTE (ex.: 2026-07,2026-08,
  //               2026-09). Default = só o mês corrente. Permite passado/futuro
  //               e meses não-contíguos (jul, set, nov...).
  //   realizado — "1" = só o que foi PAGO (faturas pagas + folha já incorrida);
  //               ausente = previsão (todas as faturas + folha de todos os meses).
  const mesesParam = (searchParams?.meses ?? "").trim();
  const mesesParsed = mesesParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}$/.test(s));
  // Dedupe + ordena ascendente (mais antigo primeiro). Default: mês corrente.
  const periodoMeses = Array.from(new Set(mesesParsed)).sort();
  if (periodoMeses.length === 0) periodoMeses.push(mesAtualKey);
  const realizado = searchParams?.realizado === "1";

  // Janela de cobertura = do 1º dia do mês mais antigo selecionado até o 1º dia
  // do mês seguinte ao mais novo (exclusive). Uma janela única pra todas as
  // queries; meses NÃO selecionados no meio (seleção não-contígua) são cortados
  // depois pelo predicate noPeriodo (que checa o mês contra o Set de selecionados).
  const [primeiroAno, primeiroMes] = periodoMeses[0].split("-").map(Number);
  const [ultimoAno, ultimoMes] = periodoMeses[periodoMeses.length - 1].split("-").map(Number);
  const inicioPeriodoISO = new Date(primeiroAno, primeiroMes - 1, 1)
    .toISOString()
    .slice(0, 10);
  const fimSelDate = new Date(ultimoAno, ultimoMes, 1)
    .toISOString()
    .slice(0, 10);

  // Predicate: a data cai num dos meses SELECIONADOS (não só dentro da janela).
  // Usa o mês (YYYY-MM) da data contra o Set — suporta seleção não-contígua.
  const mesesSet = new Set(periodoMeses);
  const monthKeyOf = (data: string): string | null => {
    const d = new Date(data);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const noPeriodo = (data: string | null | undefined) => {
    if (!data) return false;
    const k = monthKeyOf(data);
    return !!k && mesesSet.has(k);
  };

  // Dados cacheados (60s / tag financeiro-data): 3 queries em paralelo dentro
  // do unstable_cache. Repetição da mesma janela de meses sai da memória.
  const { trans, fats, equipeAtiva } = await loadFinanceiroData(
    aid,
    inicioPeriodoISO,
    fimSelDate
  );
  const transacoes = (trans as Transacao[] | null) ?? [];
  const faturasRaw = (fats ?? []) as unknown as (Fatura & {
    cliente: Pick<Cliente, "nome_empresa"> | null;
  })[];
  // Tabela mostra só faturas dos meses SELECIONADOS (a janela pode conter meses
  // no meio que não foram marcados numa seleção não-contígua).
  const faturas = faturasRaw.filter((f) => noPeriodo(f.competencia));
  // Totais das faturas selecionadas — já pago vs a receber (previsão).
  const faturasPagasPeriodo = faturas.filter((f) => f.status === "pago");
  const totalFaturasPago = faturasPagasPeriodo.reduce((s, f) => s + Number(f.valor || 0), 0);
  const totalFaturasReceber = faturas
    .filter((f) => f.status !== "pago")
    .reduce((s, f) => s + Number(f.valor || 0), 0);
  const membros = (equipeAtiva as
    | { id: string; nome: string | null; email: string | null; cargo: string | null; custo_mensal: number | null; ativo: boolean }[]
    | null) ?? [];
  const custoEquipe = membros.reduce(
    (s, u) => s + Number(u.custo_mensal ?? 0),
    0
  );
  // Só membros ativos com custo > 0 aparecem na seção "Folha de equipe".
  const membrosComCusto = membros.filter((m) => Number(m.custo_mensal ?? 0) > 0);

  // Receita/despesa de transações nos meses selecionados. Transações =
  // lançamentos já registrados (compromissos); contam nos dois modos.
  const receitasTrans = transacoes
    .filter((t) => t.tipo === "receita" && noPeriodo(t.data_vencimento))
    .reduce((s, t) => s + Number(t.valor || 0), 0);
  const despesasTrans = transacoes
    .filter((t) => t.tipo === "despesa" && noPeriodo(t.data_vencimento))
    .reduce((s, t) => s + Number(t.valor || 0), 0);

  // Faturas dos meses selecionados. REALIZADO = só pagas; PREVISÃO = todas.
  const receitaFaturas = (realizado
    ? faturas.filter((f) => f.status === "pago")
    : faturas
  ).reduce((s, f) => s + Number(f.valor || 0), 0);

  // Folha: custo mensal recorrente. REALIZADO conta só os meses selecionados
  // já incorridos (<= mês atual); PREVISÃO conta todos os meses selecionados.
  const folhaMeses = realizado
    ? periodoMeses.filter((k) => k <= mesAtualKey).length
    : periodoMeses.length;
  const folhaTotal = custoEquipe * folhaMeses;

  const kpiReceita = receitasTrans + receitaFaturas;
  const kpiDespesa = despesasTrans + folhaTotal;
  const kpiSaldo = kpiReceita - kpiDespesa;

  // Lançamentos da seção "recentes" = meses selecionados (todos os tipos).
  // Ordenado por data_vencimento desc (a query já vem assim).
  const lancamentosFiltrados = transacoes.filter((t) => noPeriodo(t.data_vencimento));

  // Soma do que está sendo exibido na tabela (só transações — faturas não
  // aparecem aqui). Usado no rodapé: saldo dos lançamentos do período.
  const totalEntradasExib = lancamentosFiltrados
    .filter((t) => t.tipo === "receita")
    .reduce((s, t) => s + Number(t.valor || 0), 0);
  const totalDespesasExib = lancamentosFiltrados
    .filter((t) => t.tipo === "despesa")
    .reduce((s, t) => s + Number(t.valor || 0), 0);
  const saldoExib = totalEntradasExib - totalDespesasExib;

  // Gráfico: um bar por mês SELECIONADO (ordenado asc — periodoMeses já vem
  // assim). Mesma regra do KPI: REALIZADO = só faturas pagas + folha incorrida;
  // PREVISÃO = todas as faturas + folha do mês.
  const byMonth: Record<string, { receita: number; despesa: number }> = {};
  for (const key of periodoMeses) byMonth[key] = { receita: 0, despesa: 0 };
  for (const t of transacoes) {
    const key = monthKeyOf(t.data_vencimento ?? "");
    if (!key || !byMonth[key]) continue;
    if (t.tipo === "receita") byMonth[key].receita += Number(t.valor || 0);
    else byMonth[key].despesa += Number(t.valor || 0);
  }
  for (const f of faturasRaw) {
    const key = monthKeyOf(f.competencia);
    if (!key || !byMonth[key]) continue;
    // REALIZADO: só pagas. PREVISÃO: todas.
    if (realizado ? f.status === "pago" : true) byMonth[key].receita += Number(f.valor || 0);
  }
  // Folha por mês: REALIZADO só nos meses já incorridos (<= atual); PREVISÃO em todos.
  for (const key of Object.keys(byMonth)) {
    const folhaMes = realizado ? (key <= mesAtualKey ? 1 : 0) : 1;
    byMonth[key].despesa += custoEquipe * folhaMes;
  }
  const chartData = Object.entries(byMonth).map(([mes, v]) => ({
    mes: new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "short" }),
    receita: v.receita,
    despesa: v.despesa,
    saldo: v.receita - v.despesa,
  }));

  // Rótulo dos meses selecionados pra mostrar nos KPIs/títulos. Se 1 mês,
  // mostra "jul/2026"; senão lista os meses (ex.: "jul, ago, set/2026"). Ano
  // repetido só muda quando muda o ano (pra não ficar "jul/26, ago/26, ...").
  const MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const rotuloMes = (k: string, comAno: boolean) => {
    const [y, m] = k.split("-").map(Number);
    return comAno ? `${MESES_PT[m - 1]}/${String(y).slice(2)}` : MESES_PT[m - 1];
  };
  const periodoLabel =
    periodoMeses.length === 1
      ? rotuloMes(periodoMeses[0], true)
      : (() => {
          const parts: string[] = [];
          for (let i = 0; i < periodoMeses.length; i++) {
            const cur = periodoMeses[i];
            const prev = i > 0 ? periodoMeses[i - 1] : null;
            const anoMudou = !prev || prev.slice(0, 4) !== cur.slice(0, 4);
            parts.push(rotuloMes(cur, anoMudou));
          }
          return parts.join(", ");
        })();
  // Sufixo de modo mostrado nos KPIs: "realizado" (só pago) vs "previsão".
  const modoLabel = realizado ? "Realizado (pago)" : "Previsão";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas e fluxo de caixa."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Financeiro" }]}
        actions={
          <>
            {/* Filtro: seleção livre de meses + caixinha "Só pago".
                Suspense = useSearchParams exige boundary. */}
            <Suspense fallback={<div className="h-8 w-[300px] animate-pulse rounded bg-bg-elevated" />}>
              <FiltroPeriodo
                mesesInicial={periodoMeses}
                realizadoInicial={realizado}
              />
            </Suspense>
            <Link href="/admin/financeiro/novo">
              <Button variant="secondary" iconLeft={<Plus className="h-4 w-4" />}>
                Novo lançamento
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-400 min-w-0">
              Receitas — {periodoLabel}
            </p>
            <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-semibold text-emerald-400 mt-2 break-words leading-tight">{formatBRL(kpiReceita)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {modoLabel}
            {!realizado && " — todas as faturas (pagas + a receber)"}
          </p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-400 min-w-0">
              Despesas — {periodoLabel}
            </p>
            <TrendingDown className="h-4 w-4 text-rose-400 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-semibold text-rose-400 mt-2 break-words leading-tight">{formatBRL(kpiDespesa)}</p>
          {custoEquipe > 0 && (
            <p className="text-[11px] text-slate-500 mt-1">
              {modoLabel} — inclui {formatBRL(folhaTotal)} de folha
              {periodoMeses.length > 1 ? ` (${folhaMeses} ${folhaMeses === 1 ? "mês" : "meses"})` : ""}
            </p>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-400 min-w-0">
              Saldo — {periodoLabel}
            </p>
            <Wallet className="h-4 w-4 text-royal-300 shrink-0" />
          </div>
          <p className={`text-xl sm:text-2xl font-semibold mt-2 break-words leading-tight ${kpiSaldo >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatBRL(kpiSaldo)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{modoLabel}</p>
        </Card>
      </div>

      {chartData.some((d) => d.receita || d.despesa) && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Fluxo de caixa — {periodoLabel}
          </h3>
          <FinanceChart data={chartData} />
        </Card>
      )}

      <Card className="!p-0">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Faturas — {periodoLabel}
          </h3>
          <form action={gerarMensaisAction} className="flex items-center gap-2">
            <input
              name="mes_referencia"
              type="month"
              className="input h-8 text-xs"
              defaultValue={periodoMeses[periodoMeses.length - 1]}
            />
            <Button type="submit" size="sm" iconLeft={<Zap className="h-3 w-3" />}>
              Gerar mensais
            </Button>
          </form>
        </div>
        {faturas.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 text-center">
            Nenhuma fatura em {periodoLabel}.{" "}
            <span className="text-slate-600">Use “Gerar mensais” pra emitir as do mês.</span>
          </p>
        ) : (
          <>
            {/* Mobile: cada fatura vira um cartão empilhado (sem scroll horizontal). */}
            <ul className="sm:hidden divide-y divide-border/50">
              {faturas.map((f) => {
                const st = FATURA_STATUS[f.status as keyof typeof FATURA_STATUS] ?? {
                  label: f.status ?? "—",
                  color: "default" as const,
                };
                return (
                  <li key={f.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {f.cliente?.nome_empresa ?? "—"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-mono">{f.numero ?? "—"}</span>
                          {" · venc. "}
                          {f.data_vencimento ? formatDate(f.data_vencimento) : "—"}
                        </p>
                      </div>
                      <Badge variant={st.color}>{st.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold text-slate-100 break-words leading-tight">
                        {formatBRL(Number(f.valor) || 0)}
                      </p>
                      {f.status !== "pago" && <MarcarFaturaPagaButton id={f.id} />}
                    </div>
                  </li>
                );
              })}
              <li className="p-4 flex flex-col gap-1 border-t border-border bg-bg-elevated/30 text-xs">
                <span className="text-slate-400">
                  Já pago · <span className="text-emerald-400 font-semibold">{formatBRL(totalFaturasPago)}</span>
                </span>
                <span className="text-slate-400">
                  A receber (previsão) · <span className="text-royal-300 font-semibold">{formatBRL(totalFaturasReceber)}</span>
                </span>
                <span className="text-slate-500">
                  Total previsto · <span className="text-slate-200 font-semibold">{formatBRL(totalFaturasPago + totalFaturasReceber)}</span>
                </span>
              </li>
            </ul>
            {/* Desktop: tabela (sm+). */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-border">
                  <th className="px-4 py-2 font-medium">Número</th>
                  <th className="px-4 py-2 font-medium">Cliente</th>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2 font-medium">Valor</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {faturas.map((f) => {
                  // Guarda contra status nulo/fora do mapa (evita crash no SSR
                  // se uma fatura vier com status inválido).
                  const st = FATURA_STATUS[f.status as keyof typeof FATURA_STATUS] ?? {
                    label: f.status ?? "—",
                    color: "default" as const,
                  };
                  return (
                    <tr key={f.id} className="border-b border-border/50">
                      <td className="px-4 py-2 text-slate-300 font-mono text-xs">{f.numero ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-100">{f.cliente?.nome_empresa ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-300">{f.data_vencimento ? formatDate(f.data_vencimento) : "—"}</td>
                      <td className="px-4 py-2 text-slate-100 font-semibold">{formatBRL(Number(f.valor) || 0)}</td>
                      <td className="px-4 py-2">
                        <Badge variant={st.color}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {f.status !== "pago" && (
                          <MarcarFaturaPagaButton id={f.id} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-bg-elevated/30 text-xs">
                  <td colSpan={3} className="px-4 py-2.5 text-right text-slate-400">
                    Já pago · <span className="text-emerald-400 font-semibold">{formatBRL(totalFaturasPago)}</span>
                    {"  ·  "}
                    A receber (previsão) · <span className="text-royal-300 font-semibold">{formatBRL(totalFaturasReceber)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-200">
                    {formatBRL(totalFaturasPago + totalFaturasReceber)}
                  </td>
                  <td colSpan={2} className="px-4 py-2.5 text-right text-slate-500">
                    total previsto
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>
          </>
        )}
      </Card>

      {/* Folha de equipe — detalha o custo já somado às despesas do mês.
          Só lista membros ativos com custo_mensal > 0. */}
      <Card className="!p-0">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Users className="h-4 w-4 text-royal-300" />
            Folha de equipe
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] text-slate-500">Custo mensal ativo</p>
              <p className="text-sm font-semibold text-rose-400">{formatBRL(custoEquipe)}</p>
            </div>
            <Link
              href="/admin/equipe"
              className="text-xs text-royal-400 hover:text-royal-300 inline-flex items-center gap-1 shrink-0"
            >
              Gerenciar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {membrosComCusto.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 text-center">
            Nenhum membro com custo mensal definido.{" "}
            <Link href="/admin/equipe" className="text-royal-400 hover:text-royal-300">
              Configurar custos
            </Link>
          </p>
        ) : (
          <>
            {/* Mobile: cada membro vira um cartão empilhado. */}
            <ul className="sm:hidden divide-y divide-border/50">
              {membrosComCusto.map((m) => (
                <li key={m.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-7 w-7 rounded-full bg-gradient-to-br from-royal-500 to-navy-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {(m.nome ?? m.email ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-100 truncate">{m.nome ?? m.email ?? "—"}</p>
                      <p className="text-xs text-slate-500">
                        {m.cargo?.trim() ? m.cargo : <span className="italic">Sem função</span>}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-rose-400 shrink-0">
                    {formatBRL(m.custo_mensal!)}
                  </p>
                </li>
              ))}
              <li className="p-4 flex items-center justify-between border-t border-border bg-bg-elevated/30">
                <span className="text-xs text-slate-400">Total da folha</span>
                <span className="font-semibold text-rose-400">{formatBRL(custoEquipe)}</span>
              </li>
            </ul>
            {/* Desktop: tabela (sm+). */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-border">
                  <th className="px-4 py-2 font-medium">Membro</th>
                  <th className="px-4 py-2 font-medium">Função</th>
                  <th className="px-4 py-2 font-medium text-right">Custo / mês</th>
                </tr>
              </thead>
              <tbody>
                {membrosComCusto.map((m) => (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full bg-gradient-to-br from-royal-500 to-navy-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {(m.nome ?? m.email ?? "?").slice(0, 1).toUpperCase()}
                        </span>
                        <span className="text-slate-100 truncate">{m.nome ?? m.email ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {m.cargo?.trim() ? (
                        m.cargo
                      ) : (
                        <span className="text-slate-600 italic">Sem função</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-rose-400 font-semibold">
                      {formatBRL(m.custo_mensal!)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-bg-elevated/30">
                  <td colSpan={2} className="px-4 py-2.5 text-right text-xs text-slate-400">
                    Total da folha
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-rose-400">
                    {formatBRL(custoEquipe)}
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>
          </>
        )}
        <div className="p-3 border-t border-border text-[11px] text-slate-500 flex items-center gap-1.5">
          <UserCog className="h-3.5 w-3.5 text-slate-600 shrink-0" />
          Este total já está incluído nas “Despesas” acima. Para não
          dobrar, não lance a folha novamente como transação.
        </div>
      </Card>

      <Card className="!p-0">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-300">Lançamentos — {periodoLabel}</h3>
        </div>
        {lancamentosFiltrados.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 text-center">Nenhum lançamento em {periodoLabel}.</p>
        ) : (
          <>
            {/* Mobile: cada lançamento vira um cartão empilhado. */}
            <ul className="sm:hidden divide-y divide-border/50">
              {lancamentosFiltrados.map((t) => (
                <li key={t.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">{t.descricao}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.data_vencimento ? formatDate(t.data_vencimento) : "—"}
                        {t.categoria ? ` · ${t.categoria}` : ""}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold shrink-0 ${t.tipo === "receita" ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.tipo === "despesa" ? "-" : "+"} {formatBRL(Number(t.valor) || 0)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={t.tipo === "receita" ? "success" : "danger"}>
                        {t.tipo}
                      </Badge>
                      {t.natureza === "fixa" ? (
                        <Badge variant="brand">Fixa</Badge>
                      ) : (
                        <Badge variant="default">Variável</Badge>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-0.5">
                      <EditarTransacaoButton
                        id={t.id}
                        tipo={t.tipo}
                        status={t.status}
                        dataVencimento={t.data_vencimento}
                        valor={Number(t.valor) || 0}
                        descricao={t.descricao}
                        categoria={t.categoria}
                        natureza={t.natureza}
                      />
                      <ExcluirTransacaoButton id={t.id} descricao={t.descricao} />
                    </div>
                  </div>
                </li>
              ))}
              <li className="p-4 flex items-center justify-between border-t border-border bg-bg-elevated/30">
                <span className="text-xs text-slate-400">Saldo dos lançamentos</span>
                <span className={`font-semibold ${saldoExib >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatBRL(saldoExib)}
                </span>
              </li>
            </ul>
            {/* Desktop: tabela (sm+). */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-border">
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Descrição</th>
                  <th className="px-4 py-2 font-medium">Categoria</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Natureza</th>
                  <th className="px-4 py-2 font-medium text-right">Valor</th>
                  <th className="px-4 py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentosFiltrados.map((t) => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="px-4 py-2 text-slate-300">{t.data_vencimento ? formatDate(t.data_vencimento) : "—"}</td>
                    <td className="px-4 py-2 text-slate-200">{t.descricao}</td>
                    <td className="px-4 py-2 text-slate-400">{t.categoria ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs uppercase">
                      {t.tipo}
                    </td>
                    <td className="px-4 py-2">
                      {t.natureza === "fixa" ? (
                        <Badge variant="brand">Fixa</Badge>
                      ) : (
                        <Badge variant="default">Variável</Badge>
                      )}
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${t.tipo === "receita" ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.tipo === "despesa" ? "-" : "+"} {formatBRL(Number(t.valor) || 0)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-0.5">
                        <EditarTransacaoButton
                          id={t.id}
                          tipo={t.tipo}
                          status={t.status}
                          dataVencimento={t.data_vencimento}
                          valor={Number(t.valor) || 0}
                          descricao={t.descricao}
                          categoria={t.categoria}
                          natureza={t.natureza}
                        />
                        <ExcluirTransacaoButton id={t.id} descricao={t.descricao} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-bg-elevated/30">
                  <td colSpan={5} className="px-4 py-2.5 text-right text-xs text-slate-400">
                    Saldo dos lançamentos
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-semibold ${
                      saldoExib >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatBRL(saldoExib)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
