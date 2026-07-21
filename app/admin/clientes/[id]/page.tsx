import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptString } from "@/lib/crypto";
import { listAccounts } from "@/lib/meta-oauth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FormSkeleton } from "@/components/ui/PageSkeleton";
import { TabsLink } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { User, FileText, BarChart3, Wallet, ClipboardList, CalendarDays, FolderArchive, AlertCircle, Clock, CheckCircle2, Mail, Phone } from "lucide-react";
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
import type { Cliente, ConexaoRede, Contrato, Fatura, Relatorio, MetaProvider } from "@/types/database";
import type { ContaMetaSelecao } from "./ConectarRedesSociais";

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
  searchParams: { tab?: string; mes?: string; meta?: string; meta_error?: string; meta_select?: string };
}) {
  const session = await requireAgenciaMember();
  // Leituras service-role (bypassa RLS). O cliente é validado por agência no
  // select abaixo (.eq("agencia_id") + notFound), e as 9 queries do Promise.all
  // filtram por .eq("cliente_id", c.id) — sem RLS por linha, fica rápido.
  const supabase = createAdminClient();
  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", params.id)
    .eq("agencia_id", session.profile.agencia_id!)
    .single();
  if (error || !cliente) notFound();
  const c = cliente as Cliente;

  // Carrega contagens + dados resumidos para mini-stats + conexões OAuth.
  // OAuth é independente das contagens (só precisa de c.id) → entra no mesmo
  // Promise.all em vez de rodar sequencial depois.
  const [
    { count: countPlan },
    { count: countRel },
    { count: countFat },
    { count: countCon },
    { count: countBri },
    { data: faturasData },
    { data: contratosData },
    { data: relatoriosData },
    { data: oauthRows },
  ] = await Promise.all([
    supabase.from("planejamentos").select("id", { count: "exact", head: true }).eq("cliente_id", c.id),
    supabase.from("relatorios").select("id", { count: "exact", head: true }).eq("cliente_id", c.id),
    supabase.from("faturas").select("id", { count: "exact", head: true }).eq("cliente_id", c.id),
    supabase.from("contratos").select("id", { count: "exact", head: true }).eq("cliente_id", c.id),
    supabase.from("briefings").select("id", { count: "exact", head: true }).eq("cliente_id", c.id),
    supabase.from("faturas").select("status, valor, data_vencimento").eq("cliente_id", c.id),
    supabase.from("contratos").select("status").eq("cliente_id", c.id),
    supabase.from("relatorios").select("alcance_total, leads_validados, receita_gerada").eq("cliente_id", c.id),
    supabase
      .from("cliente_oauth_contas")
      .select("provider, account_handle, account_name, connected_at")
      .eq("cliente_id", c.id),
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
  const conexoes = (oauthRows as ConexaoRede[] | null) ?? [];

  // Seletor de conta Meta pós-OAuth: cookie cifrado `meta_select` (5 min).
  // Lista as Páginas do usuário (com IG vinculado, se houve) pra ele escolher.
  let contasParaSelecionar: ContaMetaSelecao | null = null;
  if (searchParams.meta_select === "1") {
    const blob = cookies().get("meta_select")?.value;
    if (!blob) {
      contasParaSelecionar = { contas: [], erro: "Sessão de seleção expirou. Conecte novamente." };
    } else {
      try {
        const ctx = JSON.parse(decryptString(blob));
        if (
          ctx.clienteId === c.id &&
          ctx.agenciaId === session.profile.agencia_id &&
          ctx.userId === session.id
        ) {
          const contas = await listAccounts(ctx.token);
          contasParaSelecionar = {
            provider: ctx.provider as MetaProvider,
            contas: contas.map((p) => ({
              pageId: p.pageId,
              pageName: p.pageName,
              igUserId: p.igUserId,
              igUsername: p.igUsername,
            })),
          };
        } else {
          contasParaSelecionar = { contas: [], erro: "Sessão de seleção não pertence a este cliente." };
        }
      } catch {
        contasParaSelecionar = { contas: [], erro: "Sessão de seleção inválida. Conecte novamente." };
      }
    }
  }

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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1.5 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold text-slate-100">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            {c.nome_responsavel || "—"}
          </span>
          {c.email && (
            <span className="inline-flex items-center gap-2 text-slate-300 min-w-0">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="break-all">{c.email}</span>
            </span>
          )}
          {c.telefone && (
            <span className="inline-flex items-center gap-2 text-slate-300">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              {c.telefone}
            </span>
          )}
          {c.valor_mensal != null && (
            <span className="inline-flex items-center gap-2 text-royal-300 font-medium">
              <Wallet className="h-4 w-4 text-royal-400/70 shrink-0" />
              {formatBRL(c.valor_mensal)} <span className="text-slate-500 font-normal">/ mês</span>
            </span>
          )}
          {c.dia_vencimento && (
            <span className="inline-flex items-center gap-2 text-slate-300">
              <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
              Vence dia {c.dia_vencimento}
            </span>
          )}
        </div>
      </Card>

      <ClienteMiniStats
        faturas={(faturasData ?? []) as Pick<Fatura, "status" | "valor" | "data_vencimento">[]}
        contratos={(contratosData ?? []) as Pick<Contrato, "status">[]}
        relatorios={(relatoriosData ?? []) as Pick<Relatorio, "alcance_total" | "leads_validados" | "receita_gerada">[]}
        briefings={countBri ?? 0}
      />

      <TabsLink items={tabs} basePath={`/admin/clientes/${c.id}`} />

      {tab === "info" && (
        <InfoTab
          cliente={c}
          conexoes={conexoes}
          metaStatus={metaStatus}
          contasParaSelecionar={contasParaSelecionar}
        />
      )}
      {tab === "contratos" && (
        <Suspense fallback={<FormSkeleton />}>
          <ContratosTab cliente={c} />
        </Suspense>
      )}
      {tab === "financeiro" && (
        <Suspense fallback={<FormSkeleton />}>
          <FinanceiroTab cliente={c} />
        </Suspense>
      )}
      {tab === "planejamento" && (
        <Suspense fallback={<FormSkeleton />}>
          <PlanejamentoTab cliente={c} searchParams={{ mes: searchParams.mes }} />
        </Suspense>
      )}
      {tab === "relatorios" && (
        <Suspense fallback={<FormSkeleton />}>
          <RelatoriosTab cliente={c} searchParams={{ mes: searchParams.mes }} />
        </Suspense>
      )}
      {tab === "briefing" && (
        <Suspense fallback={<FormSkeleton />}>
          <BriefingTab cliente={c} />
        </Suspense>
      )}
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
