import Link from "next/link";
import { Suspense } from "react";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import {
  Users,
  Wallet,
  FileText,
  TrendingUp,
  ClipboardList,
  CalendarDays,
  ArrowRight,
  Mail,
  Phone,
  Sparkles,
  LifeBuoy,
  KanbanSquare,
  CalendarClock,
} from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";
import { CLIENTE_STATUS, CONTRATO_STATUS } from "@/lib/constants";
import { SITE } from "@/lib/site";
import { calcularResumoMes } from "@/lib/finance";
import { AddToHomeScreen } from "@/components/pwa/AddToHomeScreen";
import type { Cliente, Contrato } from "@/types/database";

export const metadata = { title: "Dashboard" };

// Frases motivacionais rotativas baseadas na hora do dia
function mensagemDoDia(): string {
  const h = new Date().getHours();
  const frases = {
    manha: [
      "Bom dia! Que hoje seu trabalho gere resultado para cada cliente. 🚀",
      "Novo dia, novas oportunidades para encantar seus clientes. ☕",
      "Comece o dia com foco: cada post, cada métrica, cada cliente importa. ✨",
    ],
    tarde: [
      "Boa tarde! Bora fechar o dia com produtividade. 💪",
      "Já passou da metade do dia — celebre as pequenas conquistas. 🌟",
      "Hora de olhar os números e ajustar a rota. 📊",
    ],
    noite: [
      "Boa noite! Hora de planejar o amanhã com calma. 🌙",
      "Encerrando o dia — revise o que foi entregue e o que ficou pendente. 📋",
      "Descanse bem. Amanhã tem mais cliente para impressionar. 🌠",
    ],
  };
  let bucket: keyof typeof frases;
  if (h < 12) bucket = "manha";
  else if (h < 18) bucket = "tarde";
  else bucket = "noite";
  const arr = frases[bucket];
  return arr[Math.floor(Math.random() * arr.length)];
}

export default async function AdminDashboardPage() {
  const session = await requireAgenciaMember();
  // Leituras service-role (bypassa RLS). Todas as queries filtram por
  // .eq("agencia_id", aid); calcularResumoMes também (lib/finance). Sem RLS
  // por linha fica rápido.
  const supabase = createAdminClient();
  const aid = session.profile.agencia_id!;

  // -----------------------------------------------------------------------
  // Dashboard do MEMBRO da equipe: foco nas tarefas atribuídas a ele.
  // (Admin continua com o dashboard comercial abaixo.)
  // -----------------------------------------------------------------------
  if (session.profile.role === "membro_equipe") {
    return <MemberDashboard aid={aid} membroId={session.profile.id} nome={session.profile.nome} />;
  }

  // Período do mês atual (início e fim)
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1).toISOString();

  // KPIs
  const [
    { count: clientesAtivos },
    resumo,
    { count: contratosFechadosMes },
    { data: ultimosClientes },
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("agencia_id", aid)
      .eq("status", "ativo"),
    // Receita do mês = mesma conta do Financeiro (transações receita no mês
    // + faturas PAGAS no mês) — assim atualiza ao marcar fatura como paga.
    calcularResumoMes(supabase, aid, hoje),
    // Contratos fechados no mês atual = status assinado/ativo com link_gerado_em ou created_at dentro do mês
    supabase
      .from("contratos")
      .select("id", { count: "exact", head: true })
      .eq("agencia_id", aid)
      .in("status", ["assinado", "ativo"])
      .gte("created_at", inicioMes)
      .lt("created_at", fimMes),
    supabase
      .from("clientes")
      .select("id, nome_empresa, status, valor_mensal, created_at")
      .eq("agencia_id", aid)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const receitaMes = resumo.receitas;

  const recentes = (ultimosClientes as Pick<Cliente, "id" | "nome_empresa" | "status" | "valor_mensal" | "created_at">[] | null) ?? [];

  const primeiroNome = (session.profile.nome ?? session.email ?? "você").split(" ")[0];
  const motivacional = mensagemDoDia();

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title={`Olá, ${primeiroNome}!`}
          description="Visão geral da sua agência."
        />
        {/* Mensagem motivacional + suporte SM Hub */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-royal-500/20 bg-gradient-to-r from-royal-500/10 via-bg-surface to-bg-surface px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <Sparkles className="h-4 w-4 text-royal-300 shrink-0" />
            <span className="italic">{motivacional}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
            <span className="inline-flex items-center gap-1">
              <LifeBuoy className="h-3.5 w-3.5 text-royal-300" />
              <span className="text-slate-300 font-medium">Suporte SM Hub:</span>
            </span>
            <a
              href={`mailto:${SITE.supportEmail}`}
              className="inline-flex items-center gap-1 hover:text-royal-300"
            >
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Clientes ativos"
          value={clientesAtivos ?? 0}
          icon={<Users className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Receita do mês"
          value={formatBRL(receitaMes)}
          icon={<Wallet className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Contratos fechados no mês"
          value={contratosFechadosMes ?? 0}
          icon={<FileText className="h-4 w-4" />}
          tone="warn"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-royal-300" />
              Contratos fechados recentemente
            </h3>
            <Link
              href="/admin/contratos"
              className="text-xs text-royal-400 hover:text-royal-300 inline-flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <Suspense fallback={<p className="text-sm text-slate-500">Carregando contratos…</p>}>
            <ContratosRecentes agenciaId={aid} />
          </Suspense>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Users className="h-4 w-4 text-royal-300" />
              Últimos clientes
            </h3>
            <Link
              href="/admin/clientes"
              className="text-xs text-royal-400 hover:text-royal-300 inline-flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentes.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum cliente ainda.{" "}
              <Link href="/admin/clientes/novo" className="text-royal-400 hover:text-royal-300">
                Cadastrar
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {recentes.map((c) => {
                const st = CLIENTE_STATUS[c.status];
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <Link href={`/admin/clientes/${c.id}`} className="text-slate-100 hover:text-royal-300 font-medium">
                        {c.nome_empresa}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {c.valor_mensal ? formatBRL(c.valor_mensal) + " / mês" : "Sem valor definido"}
                      </p>
                    </div>
                    <Badge variant={st.color}>{st.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-royal-300" />
          Ações rápidas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/admin/clientes/novo", label: "Novo cliente", icon: Users, desc: "Cadastrar" },
            { href: "/admin/clientes", label: "Meus clientes", icon: Users, desc: "Ver todos" },
            { href: "/admin/contratos", label: "Contratos", icon: FileText, desc: "Gerenciar" },
            { href: "/admin/financeiro", label: "Financeiro", icon: Wallet, desc: "Faturas e receitas" },
            { href: "/admin/financeiro/novo", label: "Lançar receita", icon: Wallet, desc: "Novo lançamento" },
            { href: "/admin/relatorios", label: "Relatórios", icon: TrendingUp, desc: "Métricas mensais" },
            { href: "/admin/planejamentos", label: "Planejamentos", icon: CalendarDays, desc: "Calendário editorial" },
            { href: "/admin/briefings", label: "Briefings", icon: ClipboardList, desc: "Onboarding" },
          ].map((q) => (
            <Link
              key={q.href + q.label}
              href={q.href}
              className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border border-border bg-bg-elevated/30 hover:border-royal-500/50 hover:bg-bg-elevated transition text-center"
            >
              <q.icon className="h-5 w-5 text-royal-300" />
              <span className="text-sm font-medium text-slate-200">{q.label}</span>
              <span className="text-[10px] text-slate-500">{q.desc}</span>
            </Link>
          ))}
        </div>
      </Card>

      <AddToHomeScreen />
    </div>
  );
}

// Sub-componente server: lista os contratos fechados mais recentes (assinado/ativo) do mês
async function ContratosRecentes({ agenciaId }: { agenciaId: string }) {
  const supabase = createAdminClient();
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
  const { data: rels } = await supabase
    .from("contratos")
    .select("id, titulo, status, data_fim, valor_mensal, cliente_id, created_at")
    .eq("agencia_id", agenciaId)
    .in("status", ["assinado", "ativo"])
    .gte("created_at", inicioMes)
    .order("created_at", { ascending: false })
    .limit(5);
  const contratos = (rels as Pick<Contrato, "id" | "titulo" | "status" | "data_fim" | "valor_mensal" | "cliente_id" | "created_at">[] | null) ?? [];
  if (contratos.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nenhum contrato fechado este mês.{" "}
        <Link href="/admin/contratos" className="text-royal-400 hover:text-royal-300">
          Ver todos
        </Link>
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {contratos.map((c) => {
        const st = CONTRATO_STATUS[c.status];
        return (
          <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <Link
                href={c.cliente_id ? `/admin/clientes/${c.cliente_id}?tab=contratos` : `/admin/contratos/${c.id}`}
                className="text-slate-100 hover:text-royal-300 font-medium truncate block"
              >
                {c.titulo}
              </Link>
              <p className="text-xs text-slate-500">
                Fechado em {c.created_at ? formatDate(c.created_at) : "—"}
                {c.data_fim && <> • Vence em {formatDate(c.data_fim)}</>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-slate-100">
                {c.valor_mensal ? formatBRL(c.valor_mensal) : "—"}
              </p>
              <Badge variant={st.color}>{st.label}</Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Dashboard do MEMBRO da equipe: suas tarefas atribuídas.
// ---------------------------------------------------------------------------
type MinhaTarefa = {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  prazo: string | null;
  arquivado: boolean;
  cliente_nome: string | null;
};

async function MemberDashboard({
  aid,
  membroId,
  nome,
}: {
  aid: string;
  membroId: string;
  nome: string;
}) {
  const supabase = createAdminClient();

  // Tarefas onde sou responsável
  const { data: resp } = await supabase
    .from("tarefa_responsaveis")
    .select("tarefa_id")
    .eq("usuario_id", membroId);
  const ids = (resp ?? []).map((r: any) => r.tarefa_id as string);

  let minhas: MinhaTarefa[] = [];
  if (ids.length > 0) {
    const { data: tarefas } = await supabase
      .from("tarefas")
      .select("id, titulo, status, prioridade, prazo, arquivado, cliente:clientes(nome_empresa)")
      .eq("agencia_id", aid)
      .in("id", ids);
    minhas = (tarefas ?? []).map((t: any) => ({
      id: t.id,
      titulo: t.titulo,
      status: t.status,
      prioridade: t.prioridade,
      prazo: t.prazo,
      arquivado: t.arquivado,
      cliente_nome: t.cliente?.nome_empresa ?? null,
    }));
  }

  const naoArquivadas = minhas.filter((t) => !t.arquivado);
  const counts = {
    a_fazer: naoArquivadas.filter((t) => t.status === "a_fazer").length,
    em_andamento: naoArquivadas.filter((t) => t.status === "em_andamento").length,
    revisao: naoArquivadas.filter((t) => t.status === "revisao").length,
    concluido: naoArquivadas.filter((t) => t.status === "concluido").length,
  };
  const abertas = naoArquivadas.filter((t) => t.status !== "concluido");
  const primeiroNome = (nome ?? "você").split(" ")[0];

  const STATUS_LABEL: Record<string, string> = {
    a_fazer: "A fazer",
    em_andamento: "Em andamento",
    revisao: "Revisão",
    concluido: "Concluído",
  };
  const PRIORIDADE_VARIANTE: Record<string, "default" | "info" | "warning" | "danger"> = {
    baixa: "default",
    media: "info",
    alta: "warning",
    urgente: "danger",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${primeiroNome}!`}
        description="Suas tarefas atribuídas pela equipe."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="A fazer" value={counts.a_fazer} icon={<KanbanSquare className="h-4 w-4" />} tone="default" />
        <StatCard label="Em andamento" value={counts.em_andamento} icon={<KanbanSquare className="h-4 w-4" />} tone="brand" />
        <StatCard label="Revisão" value={counts.revisao} icon={<KanbanSquare className="h-4 w-4" />} tone="warn" />
        <StatCard label="Concluído" value={counts.concluido} icon={<KanbanSquare className="h-4 w-4" />} tone="success" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-royal-300" />
            Minhas tarefas em aberto
          </h3>
          <Link
            href="/admin/tarefas"
            className="text-xs text-royal-400 hover:text-royal-300 inline-flex items-center gap-1"
          >
            Ver quadro <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {abertas.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma tarefa atribuída a você no momento. 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {abertas.slice(0, 8).map((t) => {
              const vencido =
                t.prazo && new Date(t.prazo + "T00:00:00") < new Date(new Date().toDateString());
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <Link href="/admin/tarefas" className="text-slate-100 hover:text-royal-300 font-medium truncate block">
                      {t.titulo}
                    </Link>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{STATUS_LABEL[t.status] ?? t.status}</span>
                      {t.cliente_nome && <span>· {t.cliente_nome}</span>}
                      {t.prazo && (
                        <span className={vencido ? "text-danger-400 inline-flex items-center gap-1" : "inline-flex items-center gap-1"}>
                          <CalendarClock className="h-3 w-3" />
                          {new Date(t.prazo + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant={PRIORIDADE_VARIANTE[t.prioridade] ?? "default"} className="shrink-0 capitalize">
                    {t.prioridade}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-royal-300" />
          Ações rápidas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/admin/tarefas", label: "Tarefas", icon: KanbanSquare, desc: "Meu quadro" },
            { href: "/admin/clientes", label: "Clientes", icon: Users, desc: "Ver todos" },
            { href: "/admin/planejamentos", label: "Planejamentos", icon: CalendarDays, desc: "Calendário" },
            { href: "/admin/briefings", label: "Briefings", icon: ClipboardList, desc: "Onboarding" },
          ].map((q) => (
            <Link
              key={q.href + q.label}
              href={q.href}
              className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border border-border bg-bg-elevated/30 hover:border-royal-500/50 hover:bg-bg-elevated transition text-center"
            >
              <q.icon className="h-5 w-5 text-royal-300" />
              <span className="text-sm font-medium text-slate-200">{q.label}</span>
              <span className="text-[10px] text-slate-500">{q.desc}</span>
            </Link>
          ))}
        </div>
      </Card>

      <AddToHomeScreen />
    </div>
  );
}
