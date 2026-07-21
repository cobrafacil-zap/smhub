import Image from "next/image";
import Link from "next/link";
import { requireCliente } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { ClienteMesNav } from "@/components/cliente/ClienteMesNav";
import { fraseDoDia } from "@/lib/motivacional";
import { SITE } from "@/lib/site";
import { initials, formatBRL, formatDate, formatNumber } from "@/lib/utils";
import { ENTRY_TIPO_LABEL, FATURA_STATUS } from "@/lib/constants";
import { AddToHomeScreen } from "@/components/pwa/AddToHomeScreen";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Wallet,
  ArrowRight,
  Mail,
  Phone,
  LifeBuoy,
  Sparkles,
  Eye,
  TrendingUp,
  Users,
} from "lucide-react";
import type {
  Contrato,
  EntradaStatus,
  EntradaTipo,
  Fatura,
  PlanejamentoEntrada,
  Relatorio,
} from "@/types/database";

export const metadata = { title: "Início" };

const STATUS_BADGE: Record<EntradaStatus, { label: string; variant: "default" | "success" | "danger" | "warning" | "brand" }> = {
  pendente: { label: "Pendente", variant: "warning" },
  aprovado: { label: "Aprovado", variant: "success" },
  publicado: { label: "Publicado", variant: "success" },
  rejeitado: { label: "Recusado", variant: "danger" },
  alteracao_solicitada: { label: "Mudança solicitada", variant: "warning" },
};

export default async function ClienteDashboardPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const session = await requireCliente();
  const supabase = createAdminClient();
  const clienteId = session.profile.cliente_id!;

  // Mês selecionado (YYYY-MM), default = mês atual.
  const hoje = new Date();
  const mesAtivo =
    searchParams.mes && /^\d{4}-\d{2}$/.test(searchParams.mes)
      ? searchParams.mes
      : `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [ano, mes] = mesAtivo.split("-").map(Number);
  const inicioMes = `${mesAtivo}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fimMes = `${mesAtivo}-${ultimoDia}`;

  const [contratosRes, faturasRes, postsMesRes, relatoriosRes, postsPublicadosRes] = await Promise.all([
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
    // Posts do mês selecionado
    supabase
      .from("planejamento_entradas")
      .select("id, data, titulo, tipo, status, midia_url, planejamento!inner(cliente_id)")
      .eq("planejamento.cliente_id", clienteId)
      .gte("data", inicioMes)
      .lte("data", fimMes)
      .order("data", { ascending: true }),
    // Relatórios do mês selecionado
    supabase
      .from("relatorios")
      .select("*")
      .eq("cliente_id", clienteId)
      .gte("mes_referencia", inicioMes)
      .lte("mes_referencia", fimMes),
    // Posts publicados no mês (count)
    supabase
      .from("planejamento_entradas")
      .select("id, planejamento!inner(cliente_id)", { count: "exact", head: true })
      .eq("planejamento.cliente_id", clienteId)
      .eq("status", "publicado")
      .gte("data", inicioMes)
      .lte("data", fimMes),
  ]);

  const contratos = (contratosRes.data as Contrato[] | null) ?? [];
  const faturas = (faturasRes.data as Fatura[] | null) ?? [];
  const postsMes = (postsMesRes.data as PlanejamentoEntrada[] | null) ?? [];
  const relatorios = (relatoriosRes.data as Relatorio[] | null) ?? [];
  const postsPublicadosMes = postsPublicadosRes.count ?? 0;

  // Totais de relatório do mês
  const totaisRel = relatorios.reduce(
    (acc, r) => ({
      alcance: acc.alcance + r.alcance_total,
      curtidas: acc.curtidas + r.total_curtidas,
      leads: acc.leads + r.leads_validados,
      investimento: acc.investimento + r.investimento_ads,
    }),
    { alcance: 0, curtidas: 0, leads: 0, investimento: 0 }
  );

  const primeiroNome = session.profile.nome.split(" ")[0];
  const motivacional = fraseDoDia(hoje);
  const logoUrl = session.cliente?.logo_url ?? null;
  const nomeEmpresa = session.cliente?.nome_empresa ?? "Cliente";

  return (
    <div className="space-y-6">
      {/* Cabeçalho: logo do cliente + saudação */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-royal-500 to-royal-700 flex items-center justify-center text-white font-bold overflow-hidden shrink-0 relative shadow-glow">
          {logoUrl ? (
            <Image src={logoUrl} alt={nomeEmpresa} fill sizes="56px" className="object-contain" />
          ) : (
            <span className="text-base">{initials(nomeEmpresa)}</span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Olá, {primeiroNome}!</h1>
          <p className="text-sm text-slate-400 mt-0.5">{nomeEmpresa}</p>
        </div>
      </div>

      {/* Frase motivacional + suporte */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-royal-500/20 bg-gradient-to-r from-royal-500/10 via-bg-surface to-bg-surface px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <Sparkles className="h-4 w-4 text-royal-300 shrink-0" />
          <span className="italic">{motivacional}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 shrink-0">
          <span className="inline-flex items-center gap-1">
            <LifeBuoy className="h-3.5 w-3.5 text-royal-300" />
            <span className="text-slate-300 font-medium">Suporte:</span>
          </span>
          <a href={`mailto:${SITE.supportEmail}`} className="inline-flex items-center gap-1 hover:text-royal-300">
            <Mail className="h-3.5 w-3.5" /> {SITE.supportEmail}
          </a>
          {SITE.supportPhone && (
            <>
              <span className="text-slate-600">•</span>
              <a
                href={`tel:${SITE.supportPhone.replace(/\D/g, "")}`}
                className="inline-flex items-center gap-1 hover:text-royal-300"
              >
                <Phone className="h-3.5 w-3.5" /> {SITE.supportPhone}
              </a>
            </>
          )}
        </div>
      </div>

      {/* Seletor de mês */}
      <Card>
        <ClienteMesNav mesAtivo={mesAtivo} />
        <p className="text-xs text-slate-500 mt-2">
          Mostrando posts e relatórios de {mesAtivo.replace("-", "/")}.
        </p>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Posts publicados no mês"
          value={postsPublicadosMes}
          icon={<BarChart3 className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Posts no mês"
          value={postsMes.length}
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

      {/* Posts do mês */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">Posts de {mesAtivo.replace("-", "/")}</h3>
          <Link
            href={`/cliente/planejamento?mes=${mesAtivo}`}
            className="text-xs text-royal-400 hover:text-royal-300 inline-flex items-center gap-1"
          >
            Ver no calendário <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {postsMes.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum post programado para este mês.</p>
        ) : (
          <ul className="space-y-2">
            {postsMes.slice(0, 10).map((e) => {
              const sb = STATUS_BADGE[e.status];
              const tipoLabel = ENTRY_TIPO_LABEL[e.tipo as EntradaTipo] ?? e.tipo;
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-slate-200 truncate">{e.titulo}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(e.data)} • {tipoLabel}
                    </p>
                  </div>
                  <Badge variant={sb.variant} className="shrink-0">
                    {sb.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Relatórios do mês */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">Relatórios de {mesAtivo.replace("-", "/")}</h3>
          <Link
            href="/cliente/relatorios"
            className="text-xs text-royal-400 hover:text-royal-300 inline-flex items-center gap-1"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {relatorios.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum relatório disponível para este mês.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Alcance" value={formatNumber(totaisRel.alcance)} icon={<Eye className="h-4 w-4" />} tone="brand" />
            <StatCard label="Curtidas" value={formatNumber(totaisRel.curtidas)} icon={<BarChart3 className="h-4 w-4" />} />
            <StatCard label="Leads" value={formatNumber(totaisRel.leads)} icon={<Users className="h-4 w-4" />} tone="success" />
            <StatCard
              label="Investimento"
              value={formatBRL(totaisRel.investimento)}
              icon={<TrendingUp className="h-4 w-4" />}
              tone="warn"
            />
          </div>
        )}
      </Card>

      {/* Faturas + Acesso rápido */}
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

      <AddToHomeScreen />
    </div>
  );
}