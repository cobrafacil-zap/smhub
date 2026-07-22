import { requireCliente } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Wallet, Download } from "lucide-react";
import { FATURA_STATUS } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import type { Fatura } from "@/types/database";
import { Reveal } from "@/components/ui/motion/Reveal";
import { CountUp } from "@/components/ui/motion/CountUp";

export const metadata = { title: "Financeiro" };

export default async function ClienteFinanceiroPage() {
  const session = await requireCliente();
  const supabase = createAdminClient();
  const { data: faturas } = await supabase
    .from("faturas")
    .select("*")
    .eq("cliente_id", session.profile.cliente_id!)
    .order("data_vencimento", { ascending: false })
    .limit(200);
  const list = (faturas as Fatura[] | null) ?? [];

  const totalPago = list.filter((f) => f.status === "pago").reduce((s, f) => s + f.valor, 0);
  const totalPendente = list
    .filter((f) => f.status === "pendente" || f.status === "atrasado")
    .reduce((s, f) => s + f.valor, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Suas faturas e histórico de pagamentos."
        breadcrumbs={[{ href: "/cliente", label: "Início" }, { label: "Financeiro" }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Reveal>
          <Card>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Total pago</p>
            <p className="text-xl sm:text-2xl font-bold kpi-num text-success-400 mt-1 break-words leading-tight">
              <CountUp value={totalPago} prefix="R$ " decimals={2} />
            </p>
          </Card>
        </Reveal>
        <Reveal delay={50}>
          <Card>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Pendente</p>
            <p className="text-xl sm:text-2xl font-bold kpi-num text-warning-400 mt-1 break-words leading-tight">
              <CountUp value={totalPendente} prefix="R$ " decimals={2} />
            </p>
          </Card>
        </Reveal>
        <Reveal delay={100}>
          <Card>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Faturas</p>
            <p className="text-xl sm:text-2xl font-bold kpi-num text-slate-100 mt-1 break-words leading-tight">
              <CountUp value={list.length} />
            </p>
          </Card>
        </Reveal>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet className="h-10 w-10" />}
            title="Sem faturas"
            description="Quando houver faturas para você, elas aparecerão aqui."
          />
        </Card>
      ) : (
        <Card className="!p-0">
          {/* Mobile: cada fatura vira um cartão empilhado. */}
          <ul className="sm:hidden divide-y divide-border/50">
            {list.map((f, i) => {
              const st = FATURA_STATUS[f.status];
              return (
                <Reveal as="li" key={f.id} delay={Math.min(i, 8) * 50} className="p-4 space-y-2 hover-row">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 font-mono">
                        {f.numero ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Comp. {formatDate(f.competencia)} · Venc. {formatDate(f.data_vencimento)}
                      </p>
                    </div>
                    <Badge variant={st.color}>{st.label}</Badge>
                  </div>
                  <p className="text-lg font-semibold text-slate-100 break-words leading-tight">
                    {formatBRL(f.valor)}
                  </p>
                </Reveal>
              );
            })}
          </ul>
          {/* Desktop: tabela (sm+). */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-border">
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Competência</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((f, i) => {
                  const st = FATURA_STATUS[f.status];
                  return (
                    <Reveal as="tr" key={f.id} delay={Math.min(i, 8) * 50} className="border-b border-border/50 hover-row">
                      <td className="px-4 py-3 text-slate-200">{f.numero ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(f.competencia)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(f.data_vencimento)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">
                        {formatBRL(f.valor)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.color}>{st.label}</Badge>
                      </td>
                    </Reveal>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
