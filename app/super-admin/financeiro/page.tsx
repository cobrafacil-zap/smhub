import { requireSuperAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanos } from "@/lib/planos";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Wallet, TrendingUp, Building2, CreditCard } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { PlanoValorCard } from "./PlanoValorCard";
import { Reveal } from "@/components/ui/motion/Reveal";
import { TiltCard } from "@/components/ui/motion/TiltCard";
import type { Agencia } from "@/types/database";

export const metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  await requireSuperAdmin();
  const supabase = createAdminClient();

  const [planosList, { data: ag }, { data: agAtivas }] = await Promise.all([
    getPlanos(),
    supabase.from("agencias").select("id, plano, status"),
    supabase.from("agencias").select("id, plano").eq("status", "ativa"),
  ]);

  const agList = (ag as Pick<Agencia, "id" | "plano" | "status">[] | null) ?? [];
  const agAtivasList = (agAtivas as Pick<Agencia, "id" | "plano">[] | null) ?? [];

  // MRR = soma (valor do plano) por agência ativa
  const valorPorPlano = new Map<string, number>();
  for (const p of planosList) valorPorPlano.set(p.id, Number(p.valor_mensal));

  const mrr = agAtivasList.reduce(
    (s, a) => s + (valorPorPlano.get(a.plano) ?? 0),
    0
  );

  // Contagem por plano
  const contagemPorPlano: Record<string, number> = { basico: 0, pro: 0, enterprise: 0 };
  for (const a of agAtivasList) {
    contagemPorPlano[a.plano] = (contagemPorPlano[a.plano] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Defina os preços dos planos e acompanhe a receita da plataforma."
        breadcrumbs={[{ href: "/super-admin", label: "Início" }, { label: "Financeiro" }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="MRR estimado"
          value={formatBRL(mrr)}
          icon={<Wallet className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Agências ativas"
          value={agAtivasList.length}
          icon={<Building2 className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Total cadastradas"
          value={agList.length}
          icon={<CreditCard className="h-4 w-4" />}
          tone="default"
        />
        <StatCard
          label="Ticket médio"
          value={agAtivasList.length > 0 ? formatBRL(mrr / agAtivasList.length) : "R$ 0,00"}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="default"
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Configuração de planos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planosList.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 8) * 50}>
              <TiltCard>
                <PlanoValorCard
                  plano={p}
                  agenciasAtivas={contagemPorPlano[p.id] ?? 0}
                  receitaMensal={(contagemPorPlano[p.id] ?? 0) * Number(p.valor_mensal)}
                />
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
