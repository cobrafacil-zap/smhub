import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAssinaturaStatus } from "@/lib/assinatura";
import { getPlanos } from "@/lib/planos";
import { CheckoutForm } from "./CheckoutForm";
import type { Plano } from "@/types/database";
import { Check } from "lucide-react";
import { formatBRL } from "@/lib/utils";

export const metadata = { title: "Finalizar assinatura" };

const PLANOS_VALIDOS: Plano[] = ["basico", "pro", "enterprise"];

const PLANO_LABEL: Record<Plano, string> = {
  basico: "Básico",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plano?: string };
}) {
  const planoParam = (searchParams.plano ?? "pro") as Plano;
  if (!PLANOS_VALIDOS.includes(planoParam)) redirect("/");

  const admin = createAdminClient();
  // planos (cacheado) e sessão são independentes → paralelo.
  const [planosAll, session] = await Promise.all([getPlanos(), getSessionUser()]);
  const plano = planosAll.find((p) => p.id === planoParam);
  if (!plano) redirect("/");

  let nomeAgencia: string | null = null;
  let isRenovacao = false;
  if (session && session.profile.role !== "cliente" && session.profile.agencia_id) {
    isRenovacao = true;
    const { data: ag } = await admin
      .from("agencias")
      .select("nome_fantasia")
      .eq("id", session.profile.agencia_id)
      .maybeSingle();
    nomeAgencia = ag?.nome_fantasia ?? null;
  }

  return (
    <div className="min-h-screen bg-bg text-slate-100">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <Logo variant="full" className="!h-8" />
          <a
            href="/"
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            ← Voltar
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Resumo do plano */}
          <div className="md:col-span-2">
            <Card>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Resumo do pedido
              </p>
              <h2 className="text-xl font-bold text-slate-100 mt-1">
                Plano {PLANO_LABEL[plano.id as Plano]}
              </h2>
              <p className="text-sm text-slate-400 mt-2">{plano.descricao}</p>
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-400">
                    {isRenovacao ? "Assinatura mensal" : "Depois do período grátis"}
                  </span>
                  <span className="text-2xl font-bold text-slate-100">
                    {formatBRL(Number(plano.valor_mensal))}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isRenovacao
                    ? "Cobrado mensalmente. Cancele a qualquer momento."
                    : "7 dias grátis primeiro. Depois, R$ mensal para continuar."}
                </p>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  Acesso completo à plataforma
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  Suporte dedicado
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  Atualizações gratuitas
                </li>
              </ul>
            </Card>
          </div>

          {/* Form de checkout */}
          <div className="md:col-span-3">
            <Card>
              <h2 className="text-lg font-semibold text-slate-100">
                {isRenovacao ? "Renovar assinatura" : "Criar conta"}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {isRenovacao
                  ? `Você está logado${nomeAgencia ? ` como ${nomeAgencia}` : ""}. Confirme o plano e prossiga para o pagamento.`
                  : "Preencha seus dados para criar sua conta. Você ganha 7 dias grátis para testar a plataforma — só paga depois, se quiser continuar."}
              </p>

              {isRenovacao && (
                <div className="mt-4 p-3 rounded-lg bg-royal-500/5 border border-royal-500/20 text-xs text-slate-300">
                  💳 Pagamento processado pelo <strong>Mercado Pago</strong>. Aceitamos cartão de
                  crédito, PIX e boleto.
                </div>
              )}
              {!isRenovacao && (
                <div className="mt-4 p-3 rounded-lg bg-success-500/5 border border-success-500/20 text-xs text-slate-300">
                  ✅ <strong>7 dias grátis</strong> — nenhuma cobrança agora. Você só paga após o
                  período de teste, se decidir continuar.
                </div>
              )}

              <div className="mt-6">
                <CheckoutForm
                  plano={plano.id as Plano}
                  isRenovacao={isRenovacao}
                  initialEmail={session?.email ?? ""}
                  initialNome={session?.profile.nome ?? ""}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
