import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { TabsLink } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { User, FileText, BarChart3, Wallet, ClipboardList, CalendarDays, FolderArchive, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { CLIENTE_STATUS } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import { InfoTab } from "./InfoTab";
import { PlanejamentoTab } from "./PlanejamentoTab";
import { RelatoriosTab } from "./RelatoriosTab";
import { FinanceiroTab } from "./FinanceiroTab";
import { ContratosTab } from "./ContratosTab";
import { BriefingTab } from "./BriefingTab";
import { ClienteMiniStats } from "./ClienteMiniStats";
import { ClienteStatusButtons } from "./ClienteStatusButtons";
import { ExcluirClienteButton } from "../ExcluirClienteButton";
import type { Cliente, ConexaoRede, Contrato, Fatura, Relatorio } from "@/types/database";

const TABS = [
  { key: "info", label: "Informações", icon: <User className="h-4 w-4" /> },
  { key: "contratos", label: "Contratos", icon: <FileText className="h-4 w-4" /> },
  { key: "financeiro", label: "Financeiro", icon: <Wallet className="h-4 w-4" /> },
  { key: "planejamento", label: "Planejamento", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "relatorios", label: "Relatórios", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "briefing", label: "Briefing", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "arquivos", label: "Arquivos", icon: <FolderArchive className="h-4 w-4" /> },
];

export default async function ClienteDetalhePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; mes?: string; meta?: string; meta_error?: string };
}) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", params.id)
    .eq("agencia_id", session.profile.agencia_id!)
    .single();
  if (error || !cliente) notFound();
  const c = cliente as Cliente;

  // Carrega contagens + dados resumidos para mini-stats
  const [
    { count: countPlan },
    { count: countRel },
    { count: countFat },
    { count: countCon },
    { count: countBri },
    { data: faturasData },
    { data: contratosData },
    { data: relatoriosData },
  ] = await Promise.all([
    supabase.from("planejamentos").select("id", { count: "exact", head: true }).eq("cliente_id", c.id),
    supabase.from("relatorios").select("id", { count: "exact", head: true }).eq("cliente_id", c.id),
    supabase.from("faturas").select("id", { count: "exact", head: true }).eq("cliente_id", c.id),
    supabase.from("contratos").select("id", { count: "exact", head: true }).eq("cliente_id", c.id),
    supabase.from("briefings").select("id", { count: "exact", head: true }).eq("cliente_id", c.id),
    supabase.from("faturas").select("status, valor, data_vencimento").eq("cliente_id", c.id),
    supabase.from("contratos").select("status").eq("cliente_id", c.id),
    supabase.from("relatorios").select("alcance_total, leads_validados, receita_gerada").eq("cliente_id", c.id),
  ]);

  const tabs = TABS.map((t) => {
    if (t.key === "contratos") return { ...t, count: countCon ?? undefined };
    if (t.key === "relatorios") return { ...t, count: countRel ?? undefined };
    if (t.key === "financeiro") return { ...t, count: countFat ?? undefined };
    if (t.key === "planejamento") return { ...t, count: countPlan ?? undefined };
    if (t.key === "briefing") return { ...t, count: countBri ?? undefined };
    return t;
  });

  const tab = searchParams.tab ?? "info";
  const st = CLIENTE_STATUS[c.status];

  // Conexões OAuth (Instagram/Facebook) — só colunas não-sensíveis.
  const { data: oauthRows } = await supabase
    .from("cliente_oauth_contas")
    .select("provider, account_handle, account_name, connected_at")
    .eq("cliente_id", c.id);
  const conexoes = (oauthRows as ConexaoRede[] | null) ?? [];

  const metaStatus = searchParams.meta
    ? { type: "connected" as const }
    : searchParams.meta_error
    ? { type: "error" as const, message: searchParams.meta_error }
    : null;

  // Etiquetas rápidas: faturas em aberto (não pagas/canceladas) → atrasadas e a vencer.
  const faturas = (faturasData ?? []) as Pick<Fatura, "status" | "valor" | "data_vencimento">[];
  const hoje = new Date();
  const hojeStr = hoje.toISOString().slice(0, 10);
  const limiteVencer = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const faturaAberta = (f: Pick<Fatura, "status" | "data_vencimento">) =>
    f.status !== "pago";
  const faturasAtrasadasCount = faturas.filter(
    (f) => faturaAberta(f) && (f.data_vencimento ?? "") < hojeStr
  ).length;
  const faturasAVencerCount = faturas.filter(
    (f) =>
      faturaAberta(f) &&
      (f.data_vencimento ?? "") >= hojeStr &&
      (f.data_vencimento ?? "") <= limiteVencer
  ).length;
  const inadimplente = faturasAtrasadasCount > 0;
  const aVencer = faturasAVencerCount > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.nome_empresa}
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/clientes", label: "Clientes" },
          { label: c.nome_empresa },
        ]}
        actions={
          <>
            <Badge variant={st.color}>{st.label}</Badge>
            <Link href={`/admin/contratos/gerador?cliente=${c.id}`}>
              <Button variant="secondary">Gerar contrato</Button>
            </Link>
          </>
        }
      />

      {/* Ações rápidas: etiquetas financeiras + ativar/desativar + excluir */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {inadimplente && (
              <Badge variant="danger" className="inline-flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Inadimplente ({faturasAtrasadasCount})
              </Badge>
            )}
            {aVencer && (
              <Badge variant="warning" className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                A vencer ({faturasAVencerCount})
              </Badge>
            )}
            {!inadimplente && !aVencer && (
              <Badge variant="success" className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Em dia
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ClienteStatusButtons clienteId={c.id} currentStatus={c.status} />
            <ExcluirClienteButton id={c.id} nome={c.nome_empresa} />
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-slate-300">
          <strong className="text-slate-100">{c.nome_responsavel}</strong>
          {c.email && <> • {c.email}</>}
          {c.telefone && <> • {c.telefone}</>}
          {c.valor_mensal != null && (
            <> • <span className="text-royal-300 font-medium">{formatBRL(c.valor_mensal)} / mês</span></>
          )}
          {c.dia_vencimento && <> • vence dia {c.dia_vencimento}</>}
        </p>
      </Card>

      <ClienteMiniStats
        faturas={(faturasData ?? []) as Pick<Fatura, "status" | "valor" | "data_vencimento">[]}
        contratos={(contratosData ?? []) as Pick<Contrato, "status">[]}
        relatorios={(relatoriosData ?? []) as Pick<Relatorio, "alcance_total" | "leads_validados" | "receita_gerada">[]}
        briefings={countBri ?? 0}
      />

      <TabsLink items={tabs} basePath={`/admin/clientes/${c.id}`} />

      {tab === "info" && (
        <InfoTab cliente={c} conexoes={conexoes} metaStatus={metaStatus} />
      )}
      {tab === "contratos" && <ContratosTab cliente={c} />}
      {tab === "financeiro" && <FinanceiroTab cliente={c} />}
      {tab === "planejamento" && <PlanejamentoTab cliente={c} searchParams={{ mes: searchParams.mes }} />}
      {tab === "relatorios" && <RelatoriosTab cliente={c} searchParams={{ mes: searchParams.mes }} />}
      {tab === "briefing" && <BriefingTab cliente={c} />}
      {tab === "arquivos" && (
        <Card>
          <p className="text-sm text-slate-500 text-center py-8">
            Em breve: upload de materiais e documentos do cliente.
          </p>
        </Card>
      )}
    </div>
  );
}
