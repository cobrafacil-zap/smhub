import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Building2, Users, Wallet, FileText } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";
import { AddToHomeScreen } from "@/components/pwa/AddToHomeScreen";
import type { Agencia, Contrato } from "@/types/database";

export const metadata = { title: "Super Admin" };

export default async function SuperAdminHomePage() {
  await requireSuperAdmin();
  // Super-admin usa service-role: precisa enxergar todas as agências.
  // O RLS filtra por current_agencia_id() que é null para super-admin → 0 linhas.
  const supabase = createAdminClient();

  const [
    { count: countAg },
    { data: ag },
    { count: totalClientes },
    { data: ct },
    { data: clAtivos },
  ] = await Promise.all([
    supabase.from("agencias").select("id", { count: "exact", head: true }),
    // Só colunas renderizadas — antes era select("*"), puxando logo_url etc.
    supabase
      .from("agencias")
      .select("id, nome_fantasia, email_contato, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    // contratos: NUNCA select("*") — puxa `conteudo` (HTML grande) + jsonb.
    // A lista só renderiza titulo, valor_mensal, status, created_at.
    supabase
      .from("contratos")
      .select("id, titulo, valor_mensal, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    // MRR: soma valor_mensal de clientes ativos (varre a tabela; super-admin,
    // baixo tráfego). Independente das outras → entra no paralelo.
    supabase.from("clientes").select("valor_mensal").eq("status", "ativo"),
  ]);

  const agList = (ag as Agencia[] | null) ?? [];
  const ctList = (ct as Contrato[] | null) ?? [];
  const mrr = (clAtivos ?? []).reduce((s, c) => s + Number((c as { valor_mensal?: number | null }).valor_mensal ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        description="Painel global da plataforma SM Hub."
        breadcrumbs={[{ label: "Super Admin" }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Agências</p>
            <Building2 className="h-4 w-4 text-royal-300" />
          </div>
          <p className="text-3xl font-semibold text-slate-100 mt-2">{countAg ?? 0}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Clientes</p>
            <Users className="h-4 w-4 text-royal-300" />
          </div>
          <p className="text-3xl font-semibold text-slate-100 mt-2">{totalClientes ?? 0}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">MRR estimado</p>
            <Wallet className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-semibold text-emerald-400 mt-2">{formatBRL(mrr)}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Contratos</p>
            <FileText className="h-4 w-4 text-royal-300" />
          </div>
          <p className="text-3xl font-semibold text-slate-100 mt-2">{ctList.length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="!p-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Agências recentes</h3>
            <Link href="/super-admin/agencias" className="text-xs text-royal-300 hover:text-royal-200">
              Ver todas
            </Link>
          </div>
          {agList.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">Nenhuma agência cadastrada.</p>
          ) : (
            <ul className="divide-y divide-border">
              {agList.map((a) => (
                <li key={a.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">{a.nome_fantasia}</p>
                    <p className="text-xs text-slate-500">
                      {a.email_contato ?? "—"} • {formatDate(a.created_at)}
                    </p>
                  </div>
                  <Badge variant={a.status === "ativa" ? "success" : "danger"}>
                    {a.status === "ativa" ? "Ativa" : "Suspensa"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="!p-0">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-slate-300">Contratos recentes</h3>
          </div>
          {ctList.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">Nenhum contrato ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {ctList.map((c) => (
                <li key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">{c.titulo}</p>
                    <p className="text-xs text-slate-500">
                      {c.valor_mensal ? formatBRL(c.valor_mensal) : "—"} • {formatDate(c.created_at)}
                    </p>
                  </div>
                  <Badge variant="brand">{c.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <AddToHomeScreen />
    </div>
  );
}
