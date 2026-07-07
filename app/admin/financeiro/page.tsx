import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Wallet, TrendingUp, TrendingDown, Plus, FileText, Zap } from "lucide-react";
import { FATURA_STATUS } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import { FinanceChartClient as FinanceChart } from "@/components/finance/FinanceChartClient";
import { MarcarFaturaPagaButton } from "./MarcarFaturaPagaButton";
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

export default async function FinanceiroPage() {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const today = new Date();
  const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const inicioMesPassado = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString();

  const { data: trans } = await supabase
    .from("transacoes")
    .select("*")
    .eq("agencia_id", aid)
    .gte("data_vencimento", inicioMesPassado)
    .order("data_vencimento", { ascending: false });
  const transacoes = (trans as Transacao[] | null) ?? [];

  const { data: fats } = await supabase
    .from("faturas")
    .select("*, cliente:clientes(nome_empresa)")
    .eq("agencia_id", aid)
    .order("data_vencimento", { ascending: false })
    .limit(20);
  const faturas = (fats ?? []) as (Fatura & { cliente: Pick<Cliente, "nome_empresa"> | null })[];

  // Só faturas PAGAS contam como receita — assim a "Receita do mês" atualiza
  // exatamente quando o usuário marca a fatura como paga (o botão "Marcar paga"
  // faz router.refresh(), que re-roda esta query). Filtramos por `competencia`
  // (não data_pagamento) pra não depender da migration 0023.
  const { data: fatsPagasRaw } = await supabase
    .from("faturas")
    .select("valor, competencia")
    .eq("agencia_id", aid)
    .eq("status", "pago")
    .gte("competencia", inicioMesPassado.slice(0, 10));
  const faturasPagas = (fatsPagasRaw ?? []) as { valor: number | string; competencia: string }[];

  let receitasMes = transacoes
    .filter((t) => t.tipo === "receita" && new Date(t.data_vencimento ?? "").getTime() >= new Date(inicioMes).getTime())
    .reduce((s, t) => s + Number(t.valor || 0), 0);
  receitasMes += faturasPagas
    .filter((f) => new Date(f.competencia).getTime() >= new Date(inicioMes).getTime())
    .reduce((s, f) => s + Number(f.valor || 0), 0);
  const despesasMes = transacoes
    .filter((t) => t.tipo === "despesa" && new Date(t.data_vencimento ?? "").getTime() >= new Date(inicioMes).getTime())
    .reduce((s, t) => s + Number(t.valor || 0), 0);
  const saldo = receitasMes - despesasMes;

  // agrupa por mês
  const byMonth: Record<string, { receita: number; despesa: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth[key] = { receita: 0, despesa: 0 };
  }
  for (const t of transacoes) {
    const d = new Date(t.data_vencimento ?? "");
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) continue;
    if (t.tipo === "receita") byMonth[key].receita += Number(t.valor || 0);
    else byMonth[key].despesa += Number(t.valor || 0);
  }
  for (const f of faturasPagas) {
    const d = new Date(f.competencia);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) continue;
    byMonth[key].receita += Number(f.valor || 0);
  }
  const chartData = Object.entries(byMonth).map(([mes, v]) => ({
    mes: new Date(mes + "-01").toLocaleDateString("pt-BR", { month: "short" }),
    receita: v.receita,
    despesa: v.despesa,
    saldo: v.receita - v.despesa,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas e fluxo de caixa."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Financeiro" }]}
        actions={
          <Link href="/admin/financeiro/novo">
            <Button variant="secondary" iconLeft={<Plus className="h-4 w-4" />}>
              Novo lançamento
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Receitas do mês</p>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-semibold text-emerald-400 mt-2">{formatBRL(receitasMes)}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Despesas do mês</p>
            <TrendingDown className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-semibold text-rose-400 mt-2">{formatBRL(despesasMes)}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Saldo do mês</p>
            <Wallet className="h-4 w-4 text-royal-300" />
          </div>
          <p className={`text-2xl font-semibold mt-2 ${saldo >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatBRL(saldo)}
          </p>
        </Card>
      </div>

      {chartData.some((d) => d.receita || d.despesa) && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Fluxo de caixa (últimos 6 meses)</h3>
          <FinanceChart data={chartData} />
        </Card>
      )}

      <Card className="!p-0">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Faturas recentes
          </h3>
          <form action={gerarMensaisAction} className="flex items-center gap-2">
            <input
              name="mes_referencia"
              type="month"
              className="input h-8 text-xs"
              defaultValue={new Date().toISOString().slice(0, 7)}
            />
            <Button type="submit" size="sm" iconLeft={<Zap className="h-3 w-3" />}>
              Gerar mensais
            </Button>
          </form>
        </div>
        {faturas.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 text-center">Nenhuma fatura emitida.</p>
        ) : (
          <div className="overflow-x-auto">
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
            </table>
          </div>
        )}
      </Card>

      <Card className="!p-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Lançamentos recentes</h3>
        </div>
        {transacoes.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 text-center">Nenhum lançamento ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-border">
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Descrição</th>
                  <th className="px-4 py-2 font-medium">Categoria</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.slice(0, 30).map((t) => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="px-4 py-2 text-slate-300">{t.data_vencimento ? formatDate(t.data_vencimento) : "—"}</td>
                    <td className="px-4 py-2 text-slate-200">{t.descricao}</td>
                    <td className="px-4 py-2 text-slate-400">{t.categoria ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs uppercase">
                      {t.tipo}
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${t.tipo === "receita" ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.tipo === "despesa" ? "-" : "+"} {formatBRL(Number(t.valor) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
