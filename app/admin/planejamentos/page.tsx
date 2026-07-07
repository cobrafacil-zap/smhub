import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarDays, ArrowRight, Plus, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { MONTHS_PT } from "@/lib/constants";
import { PlanejamentoPDFButton } from "@/components/calendar/PlanejamentoPDFButton";
import type { Cliente, Planejamento } from "@/types/database";

export const metadata = { title: "Planejamentos" };

export default async function PlanejamentosPage() {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  // 1) Planejamentos existentes
  const { data: plans } = await supabase
    .from("planejamentos")
    .select("*, cliente:clientes(nome_empresa)")
    .eq("agencia_id", aid)
    .order("mes_referencia", { ascending: false });
  const list = (plans ?? []) as (Planejamento & {
    cliente: Pick<Cliente, "nome_empresa"> | null;
  })[];

  // 2) Clientes ativos (para o progresso)
  const { data: clientesAtivos } = await supabase
    .from("clientes")
    .select("id, nome_empresa, status")
    .eq("agencia_id", aid)
    .in("status", ["ativo", "pausado"]);
  const ativos = (clientesAtivos ?? []) as Pick<Cliente, "id" | "nome_empresa" | "status">[];
  const totalAtivos = ativos.length;

  // 3) Cálculo do progresso do MÊS ATUAL
  const hoje = new Date();
  const mesAtualKey = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const mesAtualLabel = `${MONTHS_PT[hoje.getMonth()]} ${hoje.getFullYear()}`;
  const clientesComPlanMes = new Set(
    list.filter((p) => p.mes_referencia === mesAtualKey).map((p) => p.cliente_id)
  );
  const entreguesMes = clientesComPlanMes.size;
  const pendentesMes = ativos.filter((c) => !clientesComPlanMes.has(c.id));

  // 4) Cálculo do próximo mês (preparação)
  const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const proxKey = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}-01`;
  const proxLabel = `${MONTHS_PT[prox.getMonth()]} ${prox.getFullYear()}`;
  const clientesComPlanProx = new Set(
    list.filter((p) => p.mes_referencia === proxKey).map((p) => p.cliente_id)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planejamentos"
        description="Visão geral dos planejamentos mensais."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Planejamentos" }]}
        actions={
          <Link href="/admin/planejamentos/novo">
            <Button iconLeft={<Plus className="h-4 w-4" />}>Criar planejamento</Button>
          </Link>
        }
      />

      {/* Card de progresso do mês atual */}
      {totalAtivos > 0 && (
        <Card className="!bg-gradient-to-br !from-royal-500/10 !to-bg-surface !border-royal-500/30">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-12 w-12 rounded-lg bg-royal-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6 text-royal-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 capitalize">
                  Progresso de {mesAtualLabel}
                </p>
                <p className="text-xs text-slate-400">
                  {entreguesMes}/{totalAtivos} planejamentos entregues
                </p>
                <div className="mt-2 h-2 rounded-full bg-bg-elevated overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-royal-500 to-royal-300 transition-all"
                    style={{
                      width: `${totalAtivos > 0 ? (entreguesMes / totalAtivos) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-400 lg:text-right">
              <p>
                <span className="text-slate-300 font-medium">{entreguesMes}</span> prontos
                {" • "}
                <span className="text-warning-300 font-medium">{pendentesMes.length}</span> pendentes
              </p>
              <p className="mt-0.5">
                <span className="text-slate-500">Próximo mês ({proxLabel}):</span>{" "}
                <span className="text-slate-300 font-medium">
                  {clientesComPlanProx.size}/{totalAtivos}
                </span>
              </p>
            </div>
          </div>
          {pendentesMes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Clientes pendentes em {mesAtualLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {pendentesMes.slice(0, 8).map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/clientes/${c.id}?tab=planejamento`}
                    className="text-xs px-2.5 py-1 rounded-md bg-bg-elevated hover:bg-royal-500/20 hover:text-royal-200 text-slate-300 border border-border"
                  >
                    {c.nome_empresa}
                  </Link>
                ))}
                {pendentesMes.length > 8 && (
                  <span className="text-xs text-slate-500 px-2 py-1">
                    +{pendentesMes.length - 8} mais
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays className="h-10 w-10" />}
            title="Nenhum planejamento"
            description="Os planejamentos são criados dentro do detalhe de cada cliente."
            action={
              <Link href="/admin/clientes" className="btn btn-primary">
                Ver clientes
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
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Criado</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-slate-100 font-medium">
                      {p.cliente?.nome_empresa ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(p.mes_referencia).toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          p.status === "concluido"
                            ? "success"
                            : p.status === "aprovado"
                            ? "brand"
                            : "warning"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <PlanejamentoPDFButton planejamentoId={p.id} />
                        <Link
                          href={`/admin/clientes/${p.cliente_id}?tab=planejamento`}
                          className="text-royal-300 hover:text-royal-200 text-xs inline-flex items-center gap-1"
                        >
                          Abrir <ArrowRight className="h-3 w-3" />
                        </Link>
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
