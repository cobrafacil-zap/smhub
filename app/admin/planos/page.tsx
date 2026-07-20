import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanos } from "@/lib/planos";
import { getAssinaturaStatus, trialMaxClientes, trialDias } from "@/lib/assinatura";
import type { AssinaturaStatusInfo } from "@/lib/assinatura";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { PlanoCard, PLANO_FEATURES } from "@/components/billing/PlanoCard";
import { formatBRL, formatDate } from "@/lib/utils";
import type { Plano } from "@/types/database";

export const metadata = { title: "Planos" };

const PLANO_NOMES: Record<string, string> = {
  basico: "Básico",
  pro: "Pro",
  enterprise: "Enterprise",
};

const STATUS_LABEL: Record<AssinaturaStatusInfo["statusEfetivo"], string> = {
  trial: "Trial grátis",
  paga: "Ativa",
  vencida: "Vencida",
  cancelada: "Cancelada",
  pendente: "Pagamento pendente",
  sem_assinatura: "Sem assinatura",
};

function statusVariant(s: AssinaturaStatusInfo["statusEfetivo"]) {
  switch (s) {
    case "trial":
      return "warning" as const;
    case "paga":
      return "success" as const;
    case "vencida":
    case "cancelada":
      return "danger" as const;
    case "pendente":
      return "warning" as const;
    default:
      return "default" as const;
  }
}

export default async function PlanosPage() {
  const session = await requireAgenciaMember();
  const admin = createAdminClient();
  const aid = session.profile.agencia_id!;

  const [{ data: ag }, planosList, status] = await Promise.all([
    admin.from("agencias").select("id, nome_fantasia, plano, status").eq("id", aid).maybeSingle(),
    getPlanos(),
    getAssinaturaStatus(aid),
  ]);
  const planoAtualId = (ag?.plano ?? status.plano ?? "basico") as Plano;
  const planoAtual = planosList.find((p) => p.id === planoAtualId);
  const ass = status.assinatura;
  const semAssinatura = status.statusEfetivo === "sem_assinatura";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos"
        description="Veja sua assinatura e faça upgrade quando quiser."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Planos" }]}
      />

      {/* Assinatura atual */}
      <Card className="!p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-royal-500/10 border border-royal-500/30 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-royal-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Assinatura</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-slate-100">
                  {PLANO_NOMES[planoAtualId] ?? planoAtualId}
                </p>
                <Badge variant={statusVariant(status.statusEfetivo)}>
                  {STATUS_LABEL[status.statusEfetivo]}
                </Badge>
              </div>
            </div>
          </div>
          {planoAtual && (
            <p className="text-sm text-slate-400 shrink-0">
              {formatBRL(Number(planoAtual.valor_mensal))} <span className="text-slate-500">/mês</span>
            </p>
          )}
        </div>

        {semAssinatura || !ass ? (
          <div className="rounded-lg border border-royal-500/30 bg-royal-500/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-royal-300 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-slate-200 font-medium">
                  Você ainda não tem uma assinatura ativa.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Escolha um plano abaixo pra assinar, ou comece um trial grátis de{" "}
                  {trialDias()} dias (até {trialMaxClientes()} clientes).
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Link href="/checkout?plano=basico">
                    <Button size="sm" iconRight={<ArrowRight className="h-4 w-4" />}>
                      Começar
                    </Button>
                  </Link>
                  <Link href="/admin/assinatura">
                    <Button size="sm" variant="ghost">Mais detalhes</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Início
              </p>
              <p className="text-slate-200">{formatDate(ass.periodo_inicio)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Vencimento
              </p>
              <p className="text-slate-200">{formatDate(ass.periodo_fim)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {status.diasParaVencer != null && status.diasParaVencer >= 0 ? "Expira em" : "Venceu há"}
              </p>
              <p className="text-slate-200">
                {status.diasParaVencer != null
                  ? `${Math.abs(status.diasParaVencer)} dia(s)`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Valor</p>
              <p className="text-slate-200">
                {ass.valor_pago != null ? formatBRL(Number(ass.valor_pago)) : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Avisos: trial / grace / bloqueada */}
        {status.emTrial && ass && (
          <div className="mt-3 flex items-center gap-2 text-xs text-royal-200">
            <Sparkles className="h-3.5 w-3.5" />
            Em trial — {status.diasParaVencer ?? 0} dia(s) restante(s). Limite de {trialMaxClientes()} clientes.
          </div>
        )}
        {status.statusEfetivo === "vencida" && !status.bloqueada && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-300">
            <Clock className="h-3.5 w-3.5" />
            Assinatura vencida — grace de {status.diasGraceRestantes} dia(s). Regularize pra evitar bloqueio.
          </div>
        )}
        {status.bloqueada && !semAssinatura && (
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Acesso bloqueado. Regularize a assinatura pra liberar o painel.
          </div>
        )}

        {!semAssinatura && (
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-end">
            <Link href="/admin/assinatura">
              <Button variant="secondary" size="sm" iconRight={<ArrowRight className="h-4 w-4" />}>
                Gerenciar assinatura
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Planos disponíveis */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">Planos disponíveis</h2>
        </div>
        {planosList.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 text-center py-6">
              Nenhum plano cadastrado. Entre em contato com o suporte.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 lg:gap-6 items-stretch">
            {planosList.map((p) => {
              const isAtual = p.id === planoAtualId;
              return (
                <PlanoCard
                  key={p.id}
                  id={p.id as Plano}
                  nome={p.nome}
                  valorMensal={Number(p.valor_mensal)}
                  descricao={p.descricao}
                  features={PLANO_FEATURES[p.id as Plano]}
                  destaque={p.id === "pro"}
                  ctaLabel={isAtual ? "Plano atual" : "Assinar"}
                  ctaHref={isAtual ? undefined : `/checkout?plano=${p.id}`}
                />
              );
            })}
          </div>
        )}
      </div>

      <Card className="!p-5 bg-gradient-to-br from-royal-500/10 to-bg-surface border-royal-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-royal-300" />
            <p className="text-sm text-slate-300">
              Pagamento mensal via cartão, PIX ou boleto. Cancele quando quiser.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}