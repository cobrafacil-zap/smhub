import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Clock,
  XCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getAssinaturaStatus, trialMaxClientes, trialDias } from "@/lib/assinatura";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanos } from "@/lib/planos";
import { PlanoCard, PLANO_FEATURES } from "@/components/billing/PlanoCard";
import { formatBRL, formatDate } from "@/lib/utils";
import type { Plano } from "@/types/database";

export const metadata = { title: "Assinatura" };

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: { motivo?: string };
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin_agencia" && session.profile.role !== "membro_equipe") {
    redirect(session.profile.role === "super_admin" ? "/super-admin" : "/cliente");
  }
  const agenciaId = session.profile.agencia_id;
  if (!agenciaId) redirect("/login");

  const admin = createAdminClient();
  const [{ data: ag }, planosList, status] = await Promise.all([
    admin.from("agencias").select("id, nome_fantasia, plano, status").eq("id", agenciaId).maybeSingle(),
    getPlanos(),
    getAssinaturaStatus(agenciaId),
  ]);

  const valorAtual = planosList.find((p) => p.id === (ag?.plano ?? "basico"))?.valor_mensal ?? 0;
  const motivo = searchParams.motivo as "vencida" | "cancelada" | undefined;

  // Renderização condicional: trial disponível, plano atual, ou bloqueado.
  const isBloqueada = status.bloqueada || motivo === "vencida" || motivo === "cancelada";
  const isCancelada = ag?.status === "cancelada" || motivo === "cancelada";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex-1 p-6 lg:p-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <Logo variant="full" className="!h-8" />
          </div>

          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Assinatura da Plataforma</h1>
            <p className="text-sm text-slate-400 mt-1">
              {ag?.nome_fantasia ? `${ag.nome_fantasia} · ` : ""}
              Plano atual: <strong className="text-slate-200 capitalize">{ag?.plano ?? "basico"}</strong>
            </p>
          </div>

          {/* Status banner */}
          {isCancelada ? (
            <Card className="border-danger-500/40 bg-danger-500/5">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-danger-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-danger-300">Conta cancelada</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Esta conta foi cancelada. Para reativar, entre em contato com o suporte
                    ou escolha um plano abaixo.
                  </p>
                </div>
              </div>
            </Card>
          ) : isBloqueada ? (
            <Card className="border-danger-500/40 bg-danger-500/5">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-danger-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-danger-300">Assinatura vencida</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Sua assinatura venceu. Para continuar usando a plataforma, escolha um plano e
                    efetue o pagamento. Após a confirmação, o acesso é liberado em segundos.
                  </p>
                </div>
              </div>
            </Card>
          ) : status.emTrial ? (
            <Card className="border-royal-500/40 bg-royal-500/5">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-royal-300 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-royal-200">
                    Você está no período de teste grátis
                  </h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Restam <strong>{status.diasParaVencer}</strong> dia(s) de trial.
                    Você pode testar todos os recursos com até <strong>{trialMaxClientes()}</strong> clientes.
                    Escolha um plano abaixo para continuar usando a plataforma após o trial.
                  </p>
                </div>
              </div>
            </Card>
          ) : status.diasParaVencer !== null && status.diasParaVencer <= 5 ? (
            <Card className="border-warning-500/40 bg-warning-500/5">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-warning-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-warning-300">Renovação próxima</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Sua assinatura vence em <strong>{status.diasParaVencer}</strong> dia(s).
                    Renove agora para evitar interrupção do serviço.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-success-500/30 bg-success-500/5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-success-300">Assinatura ativa</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Plataforma liberada. Próximo vencimento:{" "}
                    <strong>
                      {status.assinatura
                        ? formatDate(status.assinatura.periodo_fim)
                        : "—"}
                    </strong>
                    .
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Detalhes da assinatura atual */}
          {status.assinatura && (
            <Card>
              <h2 className="text-base font-semibold text-slate-100 mb-4">Detalhes da assinatura</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Status</p>
                  <p className="mt-1">
                    <Badge
                      variant={
                        status.statusEfetivo === "paga" || status.statusEfetivo === "trial"
                          ? "success"
                          : status.statusEfetivo === "vencida"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {status.statusEfetivo === "paga"
                        ? "Paga"
                        : status.statusEfetivo === "trial"
                        ? "Trial"
                        : status.statusEfetivo === "vencida"
                        ? "Vencida"
                        : status.statusEfetivo === "cancelada"
                        ? "Cancelada"
                        : "Pendente"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Início</p>
                  <p className="mt-1 text-slate-200">{formatDate(status.assinatura.periodo_inicio)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Vencimento</p>
                  <p className="mt-1 text-slate-200">
                    {formatDate(status.assinatura.periodo_fim)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Valor mensal</p>
                  <p className="mt-1 text-slate-200 flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-royal-300" />
                    {formatBRL(valorAtual)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Planos */}
          <div>
            <h2 className="text-base font-semibold text-slate-100 mb-4">Escolha um plano</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {planosList.map((p) => (
                <PlanoCard
                  key={p.id}
                  id={p.id as Plano}
                  nome={p.nome}
                  valorMensal={Number(p.valor_mensal)}
                  descricao={p.descricao}
                  features={PLANO_FEATURES[p.id as Plano]}
                  destaque={p.id === "pro"}
                  ctaLabel={
                    isBloqueada
                      ? `Assinar ${p.nome} →`
                      : status.assinatura?.plano === p.id
                      ? "Plano atual"
                      : `Mudar para ${p.nome}`
                  }
                />
              ))}
            </div>
          </div>

          {/* Footer info */}
          <Card>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-royal-300 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-100">Como funciona o trial</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Novas agências recebem <strong>{trialDias()} dias grátis</strong> com até{" "}
                  <strong>{trialMaxClientes()} clientes</strong>. Após esse período, escolha um plano
                  para continuar usando a plataforma. Aceitamos cartão de crédito, PIX e boleto via
                  Mercado Pago.
                </p>
              </div>
            </div>
          </Card>

          <div className="text-center">
            <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-200">
              ← Voltar para o painel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
