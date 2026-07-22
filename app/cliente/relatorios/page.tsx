import { requireCliente } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/Stat";
import { BarChart, BarChart3, TrendingUp, Users, Eye } from "lucide-react";
import { PLATAFORMA_LABELS } from "@/lib/constants";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { Plataforma, Relatorio } from "@/types/database";
import { Reveal } from "@/components/ui/motion/Reveal";
import { CountUp } from "@/components/ui/motion/CountUp";

export const metadata = { title: "Relatórios" };

export default async function ClienteRelatoriosPage() {
  const session = await requireCliente();
  const supabase = createAdminClient();
  const { data: rels } = await supabase
    .from("relatorios")
    .select("*")
    .eq("cliente_id", session.profile.cliente_id!)
    .order("mes_referencia", { ascending: false })
    .limit(60);
  const list = (rels as Relatorio[] | null) ?? [];

  // Agrupa por mês
  const porMes = new Map<string, Relatorio[]>();
  list.forEach((r) => {
    const k = r.mes_referencia.slice(0, 7);
    if (!porMes.has(k)) porMes.set(k, []);
    porMes.get(k)!.push(r);
  });

  const meses = Array.from(porMes.keys()).sort().reverse().slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Métricas de mídias sociais consolidadas por mês."
        breadcrumbs={[{ href: "/cliente", label: "Início" }, { label: "Relatórios" }]}
      />

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 text-center py-8">
            Nenhum relatório disponível ainda. Sua agência publicará em breve.
          </p>
        </Card>
      ) : (
        meses.map((mes) => {
          const rs = porMes.get(mes)!;
          const totais = rs.reduce(
            (acc, r) => ({
              alcance: acc.alcance + r.alcance_total,
              curtidas: acc.curtidas + r.total_curtidas,
              leads: acc.leads + r.leads_validados,
              investimento: acc.investimento + r.investimento_ads,
              receita: acc.receita + r.receita_gerada,
            }),
            { alcance: 0, curtidas: 0, leads: 0, investimento: 0, receita: 0 }
          );
          const rendimentoPorLead = totais.leads > 0 ? totais.receita / totais.leads : 0;
          const [yy, mm] = mes.split("-");
          const nomeMes = new Date(Number(yy), Number(mm) - 1, 1).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          });

          return (
            <div key={mes} className="space-y-3">
              <Reveal>
                <h2 className="text-lg font-semibold text-slate-100 capitalize">{nomeMes}</h2>
              </Reveal>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard
                  label="Alcance total"
                  value={formatNumber(totais.alcance)}
                  icon={<Eye className="h-4 w-4" />}
                  tone="brand"
                />
                <StatCard
                  label="Curtidas"
                  value={formatNumber(totais.curtidas)}
                  icon={<BarChart3 className="h-4 w-4" />}
                />
                <StatCard
                  label="Leads validados"
                  value={formatNumber(totais.leads)}
                  icon={<Users className="h-4 w-4" />}
                  tone="success"
                />
                <StatCard
                  label="Investimento"
                  value={`R$ ${formatNumber(totais.investimento)}`}
                  icon={<TrendingUp className="h-4 w-4" />}
                  tone="warn"
                />
                <StatCard
                  label="R$/lead"
                  value={
                    totais.leads > 0
                      ? `R$ ${rendimentoPorLead.toFixed(2).replace(".", ",")}`
                      : "—"
                  }
                  icon={<TrendingUp className="h-4 w-4" />}
                  tone="success"
                />
              </div>
              <Card className="!p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-border">
                        <th className="px-4 py-3 font-medium">Plataforma</th>
                        <th className="px-4 py-3 font-medium">Seguidores</th>
                        <th className="px-4 py-3 font-medium">Alcance</th>
                        <th className="px-4 py-3 font-medium">Posts</th>
                        <th className="px-4 py-3 font-medium">Reels</th>
                        <th className="px-4 py-3 font-medium">Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rs.map((r, i) => (
                        <Reveal as="tr" key={r.id} delay={Math.min(i, 8) * 50} className="border-b border-border/50 hover-row">
                          <td className="px-4 py-3">
                            <Badge variant="brand">
                              {PLATAFORMA_LABELS[r.plataforma as Plataforma] ?? r.plataforma}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            <CountUp value={r.seguidores_fim} />
                            <span className="text-xs text-slate-500 ml-1">
                              ({r.seguidores_fim >= r.seguidores_inicio ? "+" : ""}
                              {r.seguidores_fim - r.seguidores_inicio})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            <CountUp value={r.alcance_total} />
                          </td>
                          <td className="px-4 py-3 text-slate-200"><CountUp value={r.total_posts} /></td>
                          <td className="px-4 py-3 text-slate-200"><CountUp value={r.total_reels} /></td>
                          <td className="px-4 py-3 text-slate-200"><CountUp value={r.leads_validados} /></td>
                        </Reveal>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          );
        })
      )}
    </div>
  );
}
