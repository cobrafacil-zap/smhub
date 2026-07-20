import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRIAL_DIAS, TRIAL_MAX_CLIENTES } from "@/lib/mercadopago";
import type { AssinaturaAtiva, Plano } from "@/types/database";

/**
 * Helpers de status de assinatura (server-side).
 *
 * Usado por:
 *  - middleware.ts (bloqueio)
 *  - lib/auth/session.ts (requireAgenciaMemberAtivo)
 *  - app/admin/layout.tsx (banner de aviso)
 *  - app/admin/assinatura/page.tsx (tela de bloqueio)
 */

export type AssinaturaStatusInfo = {
  /** Assinatura atual (a mais recente) ou null se a agência não tem. */
  assinatura: AssinaturaAtiva | null;
  /** Status "vivo" da assinatura, considerando grace period. */
  statusEfetivo: "trial" | "paga" | "vencida" | "cancelada" | "pendente" | "sem_assinatura";
  /** Dias até o vencimento (positivo = futuro, negativo = venceu). null se sem assinatura. */
  diasParaVencer: number | null;
  /** Dias restantes de grace period (0 = bloqueia hoje). */
  diasGraceRestantes: number;
  /** True se a agência está bloqueada (assinatura vencida + grace expirado OU sem assinatura). */
  bloqueada: boolean;
  /** True se em trial. */
  emTrial: boolean;
  /** Plano atual (default: 'basico'). */
  plano: Plano;
};

const MS_DIA = 86400 * 1000;

function diffDias(iso: string): number {
  const alvo = new Date(iso).getTime();
  const hoje = Date.now();
  return Math.ceil((alvo - hoje) / MS_DIA);
}

// cache() do React: dedupa chamadas com o mesmo agenciaId DENTRO do mesmo
// request (a layout e páginas filhas podem chamar juntas). Sem cache
// cross-request — status de assinatura é gate de cobrança, staleness
// poderia deixar acessar/bloquear errado. Paraleliza as 2 queries.
export const getAssinaturaStatus = cache(
  async (agenciaId: string): Promise<AssinaturaStatusInfo> => {
    const admin = createAdminClient();
    const [{ data: ag }, { data: ass }] = await Promise.all([
      admin.from("agencias").select("plano").eq("id", agenciaId).maybeSingle(),
      admin
        .from("assinatura_ativa")
        .select("*")
        .eq("agencia_id", agenciaId)
        .order("periodo_fim", { ascending: false })
        .limit(1)
        .maybeSingle<AssinaturaAtiva>(),
    ]);
    const plano = (ag?.plano ?? "basico") as Plano;

  if (!ass) {
    return {
      assinatura: null,
      statusEfetivo: "sem_assinatura",
      diasParaVencer: null,
      diasGraceRestantes: 0,
      bloqueada: true,
      emTrial: false,
      plano,
    };
  }

  const diasParaVencer = diffDias(ass.periodo_fim);
  const grace = ass.grace_period_dias ?? 5;
  const venceu = diasParaVencer < 0;
  const diasGraceRestantes = venceu ? Math.max(0, grace + diasParaVencer) : grace;

  let bloqueada = false;
  let statusEfetivo: AssinaturaStatusInfo["statusEfetivo"] = ass.status;

  if (ass.status === "paga" || ass.status === "trial") {
    if (diasParaVencer >= 0) {
      statusEfetivo = ass.status;
    } else if (diasGraceRestantes > 0) {
      // Ainda em grace: continua acessível, mas marca como vencida para UI
      statusEfetivo = "vencida";
    } else {
      statusEfetivo = "vencida";
      bloqueada = true;
    }
  } else if (ass.status === "vencida" || ass.status === "cancelada") {
    bloqueada = diasGraceRestantes <= 0;
  } else {
    // pendente → só considera bloqueada se passou muito tempo
    bloqueada = false;
  }

  return {
    assinatura: ass,
    statusEfetivo,
    diasParaVencer,
    diasGraceRestantes,
    bloqueada,
    emTrial: ass.is_trial && ass.status === "trial" && diasParaVencer >= 0,
    plano,
  };
  }
);

/** Limite de clientes durante o trial (10). Pós-trial: sem limite. */
export function trialMaxClientes(): number {
  return TRIAL_MAX_CLIENTES;
}

/** Dias de trial grátis (7). */
export function trialDias(): number {
  return TRIAL_DIAS;
}

/**
 * Cria assinatura trial para uma agência (usado pelo super-admin ao criar agência).
 * Não sobrescreve se já existir uma ativa.
 */
export async function criarAssinaturaTrial(agenciaId: string, plano: Plano = "basico") {
  const admin = createAdminClient();
  const fim = new Date(Date.now() + trialDias() * MS_DIA).toISOString();

  // Não duplica
  const { data: existente } = await admin
    .from("assinatura_ativa")
    .select("id")
    .eq("agencia_id", agenciaId)
    .gte("periodo_fim", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (existente) return existente;

  const { data, error } = await admin
    .from("assinatura_ativa")
    .insert({
      agencia_id: agenciaId,
      plano,
      status: "trial",
      periodo_inicio: new Date().toISOString(),
      periodo_fim: fim,
      is_trial: true,
      grace_period_dias: 5,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Conta clientes ativos da agência. Usado para checar o limite de 10 do trial.
 * Dedupa dentro do mesmo request (cache do React).
 */
export const countClientesAgencia = cache(
  async (agenciaId: string): Promise<number> => {
    const admin = createAdminClient();
    const { count } = await admin
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("agencia_id", agenciaId);
    return count ?? 0;
  }
);
