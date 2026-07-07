"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRIAL_MAX_CLIENTES } from "@/lib/mercadopago";
import { criarPreferenceInterno, type CriarPreferenceState } from "@/lib/assinatura-checkout";
import type { Plano } from "@/types/database";

// ============================================================================
// CRIAR PREFERENCE (delega para o helper puro)
// ============================================================================

/**
 * Server action que delega para criarPreferenceInterno.
 * Mantida para que o CheckoutForm possa usar (form action) ou para uso server-side.
 */
export async function criarPreferenceCheckoutAction(input: {
  plano: Plano;
  dados?: { nome: string; email: string; telefone?: string | null; nomeAgencia: string };
}): Promise<CriarPreferenceState> {
  return criarPreferenceInterno(input);
}

// ============================================================================
// SUPER-ADMIN: forçar renovação manual (fallback caso webhook falhe)
// ============================================================================

const forcarRenovacaoSchema = z.object({
  agenciaId: z.string().uuid(),
  dias: z.coerce.number().int().min(1).max(365).default(30),
  plano: z.enum(["basico", "pro", "enterprise"]).optional(),
});

export type ForcarRenovacaoState = { error?: string; ok?: boolean } | undefined;

export async function forcarRenovacaoAgenciaAction(
  _prev: ForcarRenovacaoState,
  formData: FormData
): Promise<ForcarRenovacaoState> {
  const session = await getSessionUser();
  if (!session || session.profile.role !== "super_admin") {
    return { error: "Acesso negado." };
  }
  const parsed = forcarRenovacaoSchema.safeParse({
    agenciaId: formData.get("agenciaId"),
    dias: formData.get("dias") || 30,
    plano: formData.get("plano") || undefined,
  });
  if (!parsed.success) return { error: "Dados inválidos." };

  const admin = createAdminClient();
  const fim = new Date(Date.now() + parsed.data.dias * 86400 * 1000).toISOString();

  await admin
    .from("assinatura_ativa")
    .update({ status: "cancelada" })
    .eq("agencia_id", parsed.data.agenciaId)
    .neq("status", "cancelada");

  const { error } = await admin.from("assinatura_ativa").insert({
    agencia_id: parsed.data.agenciaId,
    plano: parsed.data.plano ?? "pro",
    status: "paga",
    periodo_inicio: new Date().toISOString(),
    periodo_fim: fim,
    is_trial: false,
    grace_period_dias: 5,
    valor_pago: 0,
    mp_status_detail: "renovacao_manual_super_admin",
  });
  if (error) return { error: error.message };

  if (parsed.data.plano) {
    await admin
      .from("agencias")
      .update({ plano: parsed.data.plano, status: "ativa" })
      .eq("id", parsed.data.agenciaId);
  } else {
    await admin
      .from("agencias")
      .update({ status: "ativa" })
      .eq("id", parsed.data.agenciaId);
  }

  revalidatePath("/super-admin/agencias");
  return { ok: true };
}

// ============================================================================
// SUPER-ADMIN: cancelar assinatura manualmente
// ============================================================================

export async function cancelarAssinaturaAgenciaAction(agenciaId: string) {
  const session = await getSessionUser();
  if (!session || session.profile.role !== "super_admin") return;
  const admin = createAdminClient();
  await admin
    .from("assinatura_ativa")
    .update({ status: "cancelada" })
    .eq("agencia_id", agenciaId);
  await admin
    .from("agencias")
    .update({ status: "cancelada" })
    .eq("id", agenciaId);
  revalidatePath("/super-admin/agencias");
}

// ============================================================================
// REVALIDAR (após retorno do MP)
// ============================================================================

export async function revalidarAssinaturaAction() {
  revalidatePath("/admin");
  revalidatePath("/admin/assinatura");
  revalidatePath("/super-admin/agencias");
}

export { TRIAL_MAX_CLIENTES };
