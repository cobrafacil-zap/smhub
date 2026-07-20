import { requireCliente } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardEmpty } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { CONTRATO_STATUS } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import type { Contrato } from "@/types/database";

export const metadata = { title: "Meus contratos" };

export default async function ClienteContratosPage() {
  const session = await requireCliente();
  const supabase = createAdminClient();
  const { data: contratos } = await supabase
    .from("contratos")
    // Só colunas da listagem — sem `conteudo` (texto grande do contrato).
    .select("id, titulo, status, valor_mensal, data_inicio, data_fim, created_at")
    .eq("cliente_id", session.profile.cliente_id!)
    .order("created_at", { ascending: false })
    .limit(100);
  const list = (contratos as Contrato[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus contratos"
        description="Visualize e assine digitalmente os contratos da sua agência."
        breadcrumbs={[{ href: "/cliente", label: "Início" }, { label: "Contratos" }]}
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="Nenhum contrato ainda"
            description="Quando a sua agência emitir um contrato, ele aparecerá aqui para assinatura."
          />
        </Card>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-border">
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Vigência</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const st = CONTRATO_STATUS[c.status];
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-bg-elevated/50">
                      <td className="px-4 py-3 font-medium text-slate-100">{c.titulo}</td>
                      <td className="px-4 py-3 text-slate-200">
                        {c.valor_mensal ? formatBRL(c.valor_mensal) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {c.data_inicio && c.data_fim
                          ? `${formatDate(c.data_inicio)} → ${formatDate(c.data_fim)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.color}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/cliente/contratos/${c.id}`}>
                          <Button variant="ghost" size="sm">Abrir</Button>
                        </Link>
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
