import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardEmpty } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileText, Plus, Sparkles } from "lucide-react";
import { CONTRATO_STATUS } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import type { Contrato } from "@/types/database";

export const metadata = { title: "Contratos" };

export default async function ContratosPage() {
  const session = await requireAgenciaMember();
  const supabase = createAdminClient();
  const { data: contratos } = await supabase
    .from("contratos")
    // Só colunas usadas pela listagem — NÃO traz `conteudo` (texto grande
    // do contrato), que é o campo que mais pesa num select("*").
    .select("id, titulo, status, valor_mensal, data_inicio, duracao_meses, created_at, cliente_id")
    .eq("agencia_id", session.profile.agencia_id!)
    .order("created_at", { ascending: false })
    .limit(200);

  const list = (contratos as Contrato[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        description="Gerencie contratos digitais com templates, PDF e assinatura eletrônica."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Contratos" }]}
        actions={
          <>
            <Link href="/admin/contratos/templates">
              <Button variant="secondary" iconLeft={<FileText className="h-4 w-4" />}>
                Templates
              </Button>
            </Link>
            <Link href="/admin/contratos/gerador">
              <Button iconLeft={<Sparkles className="h-4 w-4" />}>Gerar contrato</Button>
            </Link>
          </>
        }
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="Nenhum contrato ainda"
            description="Crie seu primeiro contrato a partir de um template pronto."
            action={
              <Link href="/admin/contratos/gerador">
                <Button iconLeft={<Plus className="h-4 w-4" />}>Gerar contrato</Button>
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
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Duração</th>
                  <th className="px-4 py-3 font-medium">Início</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const st = CONTRATO_STATUS[c.status];
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-bg-elevated/50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/contratos/${c.id}`}
                          className="font-medium text-slate-100 hover:text-royal-300"
                        >
                          {c.titulo}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {c.valor_mensal ? formatBRL(c.valor_mensal) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {c.duracao_meses ?? "—"} {c.duracao_meses ? "meses" : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {c.data_inicio ? formatDate(c.data_inicio) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.color}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/contratos/${c.id}`}>
                          <Button variant="ghost" size="sm">Ver</Button>
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
