import { requireCliente } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { BarChart3, CalendarDays, FileText, Wallet, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatBRL, formatDate } from "@/lib/utils";
import { CONTRATO_STATUS, FATURA_STATUS } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import type { Contrato, Fatura, PlanejamentoEntrada } from "@/types/database";

export default async function ClienteDashboardPage() {
  const session = await requireCliente();
  const supabase = createClient();
  const clienteId = session.profile.cliente_id!;

  const [contratosRes, faturasRes, proximasRes] = await Promise.all([
    supabase
      .from("contratos")
      .select("id, titulo, status, valor_mensal, data_fim")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("faturas")
      .select("id, competencia, valor, data_vencimento, status, numero")
      .eq("cliente_id", clienteId)
      .order("data_vencimento", { ascending: false })
      .limit(5),
    supabase
      .from("planejamento_entradas")
      .select("id, data, titulo, tipo, status, planejamento_id")
      .gte("data", new Date().toISOString().slice(0, 10))
      .order("data", { ascending: true })
      .limit(10),
  ]);

  const contratos = (contratosRes.data as Contrato[] | null) ?? [];
  const faturas = (faturasRes.data as Fatura[] | null) ?? [];
  const proximas = (proximasRes.data as PlanejamentoEntrada[] | null) ?? [];

  // Próximos posts do mês (entradas do mês atual)
  const { count: postsCount } = await supabase
    .from("planejamento_entradas")
    .select("id, planejamento!inner(cliente_id)", { count: "exact", head: true })
    .eq("planejamento.cliente_id", clienteId)
    .eq("status", "publicado");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Olá, {session.profile.nome.split(" ")[0]}!
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Acompanhe seus planejamentos, relatórios e contratos.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Posts publicados"
          value={postsCount ?? 0}
          icon={<BarChart3 className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Próximas entradas"
          value={proximas.length}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Contratos ativos"
          value={contratos.filter((c) => ["assinado", "ativo"].includes(c.status)).length}
          icon={<FileText className="h-4 w-4" />}
          tone="default"
        />
        <StatCard
          label="Faturas pendentes"
          value={faturas.filter((f) => f.status === "pendente").length}
          icon={<Wallet className="h-4 w-4" />}
          tone="warn"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Próximas postagens</h3>
            <Link
              href="/cliente/planejamento"
              className="text-xs text-royal-400 hover:text-royal-300 inline-flex items-center gap-1"
            >
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {proximas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma entrada agendada.</p>
          ) : (
            <ul className="space-y-2">
              {proximas.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="text-slate-200">{e.titulo}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(e.data)} • {e.tipo}
                    </p>
                  </div>
                  <Badge variant="info">{e.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Últimas faturas</h3>
            <Link
              href="/cliente/financeiro"
              className="text-xs text-royal-400 hover:text-royal-300 inline-flex items-center gap-1"
            >
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {faturas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma fatura.</p>
          ) : (
            <ul className="space-y-2">
              {faturas.slice(0, 5).map((f) => {
                const st = FATURA_STATUS[f.status];
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="text-slate-200">{f.numero ?? formatDate(f.competencia)}</p>
                      <p className="text-xs text-slate-500">Vence em {formatDate(f.data_vencimento)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-100">{formatBRL(f.valor)}</p>
                      <Badge variant={st.color}>{st.label}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Acesso rápido</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/cliente/planejamento", label: "Planejamento", icon: CalendarDays },
            { href: "/cliente/relatorios", label: "Relatórios", icon: BarChart3 },
            { href: "/cliente/contratos", label: "Contratos", icon: FileText },
            { href: "/cliente/financeiro", label: "Financeiro", icon: Wallet },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-border bg-bg-elevated/30 hover:border-royal-500/50 hover:bg-bg-elevated transition"
            >
              <q.icon className="h-5 w-5 text-royal-300" />
              <span className="text-sm font-medium text-slate-200">{q.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
