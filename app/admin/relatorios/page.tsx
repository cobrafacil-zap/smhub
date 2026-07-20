import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart3, Plus, Pencil } from "lucide-react";
import { PLATAFORMA_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { DeletarRelatorioButton } from "./DeletarRelatorioButton";
import type { Cliente, Relatorio } from "@/types/database";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  const session = await requireAgenciaMember();
  const supabase = createAdminClient();
  const { data: rels } = await supabase
    .from("relatorios")
    .select("*, cliente:clientes(nome_empresa)")
    .eq("agencia_id", session.profile.agencia_id!)
    .order("mes_referencia", { ascending: false })
    .limit(200);
  const list = (rels ?? []) as (Relatorio & { cliente: Pick<Cliente, "nome_empresa"> | null })[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Relatórios mensais de mídias sociais."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Relatórios" }]}
        actions={
          <Link href="/admin/relatorios/novo">
            <Button iconLeft={<Plus className="h-4 w-4" />}>Novo relatório</Button>
          </Link>
        }
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="h-10 w-10" />}
            title="Sem relatórios"
            description="Cadastre o primeiro relatório."
            action={
              <Link href="/admin/relatorios/novo">
                <Button iconLeft={<Plus className="h-4 w-4" />}>Novo relatório</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-border">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Mês</th>
                  <th className="px-4 py-3 font-medium">Plataforma</th>
                  <th className="px-4 py-3 font-medium text-right">Alcance</th>
                  <th className="px-4 py-3 font-medium text-right">Leads</th>
                  <th className="px-4 py-3 font-medium text-right">Receita</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-slate-100 font-medium">
                      {r.cliente?.nome_empresa ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(r.mes_referencia).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="brand">{PLATAFORMA_LABELS[r.plataforma] ?? r.plataforma}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-right">{formatNumber(r.alcance_total)}</td>
                    <td className="px-4 py-3 text-slate-300 text-right">{r.leads_validados}</td>
                    <td className="px-4 py-3 text-slate-100 text-right font-semibold">
                      R$ {formatNumber(r.receita_gerada)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          href={`/admin/relatorios/${r.id}/editar`}
                          className="text-slate-300 hover:text-white"
                          title="Editar relatório"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <DeletarRelatorioButton id={r.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
