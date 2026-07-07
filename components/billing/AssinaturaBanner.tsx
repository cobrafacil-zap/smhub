import Link from "next/link";
import { AlertTriangle, XCircle } from "lucide-react";

interface AssinaturaBannerProps {
  statusEfetivo: "trial" | "paga" | "vencida" | "cancelada" | "pendente" | "sem_assinatura";
  diasParaVencer: number | null;
  emTrial: boolean;
  /** Limite de clientes no trial (default 10). */
  maxClientesTrial?: number;
  /** Quantos clientes já tem. */
  clientesAtuais?: number;
}

/**
 * Banner amarelo/vermelho exibido no topo do /admin.
 * - Em trial: "Você está no trial — X dia(s) restante(s) e Y/10 clientes usados"
 * - Vence em ≤ 5 dias: "Sua assinatura vence em X dia(s)"
 * - Vencida (em grace): "Sua assinatura venceu há X dia(s). Renove para evitar bloqueio."
 */
export function AssinaturaBanner({
  statusEfetivo,
  diasParaVencer,
  emTrial,
  maxClientesTrial = 10,
  clientesAtuais = 0,
}: AssinaturaBannerProps) {
  if (statusEfetivo === "paga" && (diasParaVencer === null || diasParaVencer > 5)) {
    return null;
  }

  // Trial: informativo
  if (emTrial && diasParaVencer !== null && diasParaVencer >= 0) {
    const restantes = Math.max(0, maxClientesTrial - clientesAtuais);
    return (
      <div className="bg-royal-500/10 border-b border-royal-500/30 px-4 py-2.5 text-royal-200 text-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Período de teste grátis:</strong> {diasParaVencer} dia(s) restante(s).
            {clientesAtuais > 0 && (
              <> Você pode usar até <strong>{maxClientesTrial}</strong> clientes durante o trial
              (atualmente <strong>{clientesAtuais}</strong>). Restam <strong>{restantes}</strong> vagas.</>
            )}
          </span>
        </div>
        <Link
          href="/admin/assinatura"
          className="text-royal-100 hover:text-white underline font-semibold whitespace-nowrap"
        >
          Escolher plano
        </Link>
      </div>
    );
  }

  // Vence em 0-5 dias
  if (
    statusEfetivo === "paga" &&
    diasParaVencer !== null &&
    diasParaVencer >= 0 &&
    diasParaVencer <= 5
  ) {
    return (
      <div className="bg-warning-500/10 border-b border-warning-500/30 px-4 py-2.5 text-warning-400 text-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Sua assinatura vence em <strong>{diasParaVencer} dia(s)</strong>. Renove para evitar
            o bloqueio da plataforma.
          </span>
        </div>
        <Link
          href="/admin/assinatura"
          className="text-warning-200 hover:text-white underline font-semibold whitespace-nowrap"
        >
          Renovar
        </Link>
      </div>
    );
  }

  // Vencida (em grace)
  if (statusEfetivo === "vencida") {
    return (
      <div className="bg-danger-500/10 border-b border-danger-500/40 px-4 py-2.5 text-danger-400 text-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            Sua assinatura venceu. Renove agora para manter o acesso à plataforma.
          </span>
        </div>
        <Link
          href="/admin/assinatura"
          className="text-danger-200 hover:text-white underline font-semibold whitespace-nowrap"
        >
          Renovar agora
        </Link>
      </div>
    );
  }

  return null;
}
