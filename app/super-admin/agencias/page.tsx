import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanos } from "@/lib/planos";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toggleAgenciaAtivaAction } from "@/lib/actions/super-admin-actions";
import { Reveal } from "@/components/ui/motion/Reveal";
import { AgenciaPlanoSelect } from "./AgenciaPlanoSelect";
import { ForcarRenovacaoButton } from "./ForcarRenovacaoButton";
import { DeletarAgenciaButton } from "./DeletarAgenciaButton";
import type { Agencia, AssinaturaAtiva } from "@/types/database";

export const metadata = { title: "Agências" };

export default async function AgenciasPage() {
  await requireSuperAdmin();
  const supabase = createAdminClient();

  // Selects estreitos: antes era select("*") em agencias e assinatura_ativa,
  // puxando colunas pesadas (mp_payment_id, mp_preference_id, logo_url, etc.)
  // sem limite. assinatura_ativa cresce com o histórico de cobranças —
  // selecionar só o necessário + limite de segurança reduz payload e tempo.
  const [{ data: ag }, planosList, { data: assinaturas }] = await Promise.all([
    supabase
      .from("agencias")
      .select("id, nome_fantasia, email_contato, plano, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    getPlanos(),
    supabase
      .from("assinatura_ativa")
      .select("agencia_id, status, is_trial, periodo_fim")
      .order("periodo_fim", { ascending: false })
      .limit(2000),
  ]);

  const list = (ag as Agencia[] | null) ?? [];
  const assList = (assinaturas as AssinaturaAtiva[] | null) ?? [];

  // Para cada agência, pega a assinatura mais recente
  const assPorAgencia = new Map<string, AssinaturaAtiva>();
  for (const a of assList) {
    if (!assPorAgencia.has(a.agencia_id)) {
      assPorAgencia.set(a.agencia_id, a);
    }
  }

  const valorPorPlano = new Map<string, number>();
  for (const p of planosList) valorPorPlano.set(p.id, Number(p.valor_mensal));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agências"
        description="Gerencie todas as agências da plataforma."
        breadcrumbs={[{ href: "/super-admin", label: "Início" }, { label: "Agências" }]}
        actions={
          <Link
            href="/super-admin/agencias/novo"
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md bg-royal-500 hover:bg-royal-600 text-white transition"
          >
            <Plus className="h-4 w-4" />
            Nova agência
          </Link>
        }
      />

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 text-center py-8">
            Nenhuma agência cadastrada ainda.
          </p>
        </Card>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-border">
                  <th className="px-4 py-3 font-medium">Agência</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Plano</th>
                  <th className="px-4 py-3 font-medium">Assinatura</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Cadastro</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a, i) => {
                  const ass = assPorAgencia.get(a.id);
                  return (
                    <Reveal as="tr" key={a.id} delay={Math.min(i, 8) * 50} className="border-b border-border/50 hover-row">
                      <td className="px-4 py-3 text-slate-100 font-medium">
                        {a.nome_fantasia}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {a.email_contato ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <AgenciaPlanoSelect
                          agenciaId={a.id}
                          planoAtual={(a.plano ?? "basico") as "basico" | "pro" | "enterprise"}
                          valorAtual={valorPorPlano.get(a.plano ?? "") ?? 0}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {ass ? (
                          <div className="space-y-1">
                            <Badge
                              variant={
                                ass.status === "paga" || ass.status === "trial"
                                  ? "success"
                                  : ass.status === "vencida"
                                  ? "danger"
                                  : "warning"
                              }
                            >
                              {ass.is_trial ? "Trial" : ass.status}
                            </Badge>
                            <p className="text-[10px] text-slate-500">
                              {ass.is_trial ? "Trial até " : "Vence "}
                              {formatDate(ass.periodo_fim)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={a.status === "ativa" ? "success" : "danger"}>
                          {a.status === "ativa" ? "Ativa" : a.status === "suspensa" ? "Suspensa" : "Cancelada"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatDate(a.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <ForcarRenovacaoButton agenciaId={a.id} plano={a.plano ?? "pro"} />
                          <form
                            action={toggleAgenciaAtivaAction.bind(null, a.id, a.status !== "ativa")}
                            className="inline"
                          >
                            <button
                              type="submit"
                              className={`text-xs px-3 py-1.5 rounded-md transition ${
                                a.status === "ativa"
                                  ? "bg-danger-500/10 text-danger-300 hover:bg-danger-500/20"
                                  : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              }`}
                            >
                              {a.status === "ativa" ? "Suspender" : "Reativar"}
                            </button>
                          </form>
                          <DeletarAgenciaButton agenciaId={a.id} nome={a.nome_fantasia} />
                        </div>
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
