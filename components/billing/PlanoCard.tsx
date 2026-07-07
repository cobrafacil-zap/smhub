import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatBRL } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Plano } from "@/types/database";

interface PlanoCardProps {
  id: Plano;
  nome: string;
  valorMensal: number;
  descricao: string | null;
  features: string[];
  /** "primary" destaca o card com borda brilhante. */
  destaque?: boolean;
  /** Se true, é um botão "Renovar" (usado em /admin/assinatura). */
  ctaLabel?: string;
  ctaHref?: string;
}

/**
 * Card de plano usado tanto na LP quanto em /admin/assinatura.
 */
export function PlanoCard({
  id,
  nome,
  valorMensal,
  descricao,
  features,
  destaque = false,
  ctaLabel = "Assinar",
  ctaHref,
}: PlanoCardProps) {
  const href = ctaHref ?? `/checkout?plano=${id}`;
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-6 flex flex-col h-full",
        "bg-bg-surface shadow-soft transition-shadow",
        destaque
          ? "border-royal-500/60 shadow-elevated ring-1 ring-royal-500/30"
          : "border-border hover:shadow-elevated"
      )}
    >
      {destaque && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-royal-500 to-royal-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
          Mais popular
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-100">{nome}</h3>
        {descricao && (
          <p className="text-sm text-slate-400 mt-1">{descricao}</p>
        )}
      </div>
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-100">{formatBRL(valorMensal)}</span>
          <span className="text-sm text-slate-400">/mês</span>
        </div>
      </div>
      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
            <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href={href}>
        <Button
          size="lg"
          className="w-full"
          variant={destaque ? "primary" : "outline"}
        >
          {ctaLabel}
        </Button>
      </Link>
    </div>
  );
}

/** Features padrão por plano. */
export const PLANO_FEATURES: Record<Plano, string[]> = {
  basico: [
    "Até 5 clientes ativos",
    "Planejamento editorial mensal",
    "Relatórios de mídias sociais",
    "Financeiro básico (receitas/despesas)",
    "1 usuário (admin)",
    "Suporte por e-mail",
  ],
  pro: [
    "Até 20 clientes ativos",
    "Planejamento editorial ilimitado",
    "Relatórios completos + métricas diárias",
    "Gestão financeira completa (faturas, recibos)",
    "Contratos digitais com assinatura eletrônica",
    "Até 5 usuários (admin + equipe)",
    "Suporte prioritário",
  ],
  enterprise: [
    "Clientes ilimitados",
    "Tudo do plano Pro",
    "API e integrações personalizadas",
    "Múltiplas agências (white-label)",
    "Usuários ilimitados",
    "Gerente de sucesso dedicado",
    "Onboarding e treinamento",
  ],
};
