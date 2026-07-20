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
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total pago</p>
          <p className="text-2xl font-bold kpi-num text-success-400 mt-1">
            {formatBRL(totalPago)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Pendente</p>
          <p className="text-2xl font-bold kpi-num text-warning-400 mt-1">
            {formatBRL(totalPendente)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Faturas</p>
          <p className="text-2xl font-bold kpi-num text-slate-100 mt-1">{list.length}</p>
        </Card>
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
          <div className="overflow-x-auto">
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
                {list.map((f) => {
                  const st = FATURA_STATUS[f.status];
                  return (
                    <tr key={f.id} className="border-b border-border/50">
                      <td className="px-4 py-3 text-slate-200">{f.numero ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(f.competencia)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatDate(f.data_vencimento)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">
                        {formatBRL(f.valor)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.color}>{st.label}</Badge>
                      </td>
                    </tr>
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
