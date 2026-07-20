"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarPreferenceInterno, type CriarPreferenceState } from "@/lib/assinatura-checkout";
import { criarAssinaturaTrial } from "@/lib/assinatura";
import { sendEmail, emailBoasVindasPlataforma } from "@/lib/email";
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

  try {
    const { error: cancelErr } = await admin
      .from("assinatura_ativa")
      .update({ status: "cancelada" })
      .eq("agencia_id", parsed.data.agenciaId)
      .neq("status", "cancelada");
    if (cancelErr) {
      console.error("[forcarRenovacao] erro ao cancelar anterior:", cancelErr);
      return { error: cancelErr.message };
    }

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
    if (error) {
      console.error("[forcarRenovacao] erro ao inserir assinatura:", error);
      return { error: error.message };
    }

    if (parsed.data.plano) {
      const { error: agErr } = await admin
        .from("agencias")
        .update({ plano: parsed.data.plano, status: "ativa" })
        .eq("id", parsed.data.agenciaId);
      if (agErr) console.error("[forcarRenovacao] erro ao atualizar agencia:", agErr);
    } else {
      const { error: agErr } = await admin
        .from("agencias")
        .update({ status: "ativa" })
        .eq("id", parsed.data.agenciaId);
      if (agErr) console.error("[forcarRenovacao] erro ao atualizar agencia:", agErr);
    }
  } catch (err) {
    // Captura qualquer exceção (ex.: falha de rede Supabase) para não virar
    // "Application error: a server-side exception has occurred" sem diagnóstico.
    console.error("[forcarRenovacao] exceção:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Erro ao renovar: ${msg}` };
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

// ============================================================================
// INICIAR TRIAL GRÁTIS (auto-cadastro SEM pagamento)
// ----------------------------------------------------------------------------
// Fluxo "Começar grátis": cria o cadastro agora (auth user + agência + usuário
// + assinatura TRIAL de 7 dias) e envia o link de ativação por e-mail. NÃO
// cobra nada na assinatura. Após os 7 dias de trial (+ grace), a plataforma
// bloqueia até o usuário pagar (fluxo de renovação via Mercado Pago) — ou
// seja, ele só paga DEPOIS de usar por 7 dias. Reusa exatamente a infra de
// trial + bloqueio + renovação já existente.
// ============================================================================

const iniciarTrialSchema = z.object({
  plano: z.enum(["basico", "pro", "enterprise"]),
  dados: z.object({
    nome: z.string().min(2, "Informe seu nome."),
    email: z.string().email("E-mail inválido."),
    telefone: z.string().optional().nullable(),
    nomeAgencia: z.string().min(2, "Informe o nome da agência."),
  }),
});

export type IniciarTrialState =
  | { ok: true; token: string }
  | { ok: false; error: string };

function gerarSenhaTemp(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[bytes[i] % chars.length];
  return s;
}

function gerarToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function iniciarTrialGratisAction(input: {
  plano: Plano;
  dados: { nome: string; email: string; telefone?: string | null; nomeAgencia: string };
}): Promise<IniciarTrialState> {
  // Usuário já logado (admin/agência) não usa trial aqui — deve renovar.
  const session = await getSessionUser();
  if (session && session.profile.role !== "cliente") {
    return { ok: false, error: "Você já tem uma conta. Faça login e use a renovação." };
  }

  const parsed = iniciarTrialSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { plano, dados } = parsed.data;
  const email = dados.email.toLowerCase();
  const admin = createAdminClient();

  // 1) E-mail já cadastrado?
  const { data: existe } = await admin
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existe) {
    return { ok: false, error: "E-mail já cadastrado. Faça login para renovar sua assinatura." };
  }

  // 2) Cria auth user (senha temporária — o usuário redefine via /ativar)
  const senhaTemp = gerarSenhaTemp();
  const { data: signData, error: signErr } = await admin.auth.admin.createUser({
    email,
    password: senhaTemp,
    email_confirm: true,
    user_metadata: { nome: dados.nome, role: "admin_agencia" },
  });
  if (signErr || !signData.user) {
    return { ok: false, error: signErr?.message ?? "Erro ao criar usuário." };
  }
  const userId = signData.user.id;

  // 3) Cria agência
  const { data: ag, error: agErr } = await admin
    .from("agencias")
    .insert({
      nome_fantasia: dados.nomeAgencia,
      status: "ativa",
      plano,
      email_contato: email,
      telefone: dados.telefone?.trim() || null,
    })
    .select("id")
    .single();
  if (agErr || !ag) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { ok: false, error: agErr?.message ?? "Erro ao criar agência." };
  }
  const agenciaId = ag.id;

  // 4) Cria usuário (admin_agencia)
  const { error: userErr } = await admin.from("usuarios").insert({
    user_id: userId,
    agencia_id: agenciaId,
    nome: dados.nome,
    email,
    role: "admin_agencia",
    ativo: true,
  });
  if (userErr) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    await admin.from("agencias").delete().eq("id", agenciaId);
    return { ok: false, error: userErr.message };
  }

  // 5) Assinatura TRIAL de 7 dias (sem pagamento)
  try {
    await criarAssinaturaTrial(agenciaId, plano);
  } catch (err) {
    console.error("[iniciarTrial] erro ao criar trial:", err);
    // não aborta — a conta existe; o admin pode forçar renovação depois.
  }

  // 6) Token de ativação (link /ativar para definir a senha real)
  const token = gerarToken();
  const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: tokErr } = await admin.from("signup_tokens").insert({
    token,
    email,
    nome: dados.nome,
    nome_agencia: dados.nomeAgencia,
    plano,
    user_id: userId,
    agencia_id: agenciaId,
    expira_em: expiraEm,
  });
  if (tokErr) console.error("[iniciarTrial] erro signup_token:", tokErr.message);

  // 7) E-mail de boas-vindas com o link de ativação
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    await sendEmail({
      to: email,
      ...emailBoasVindasPlataforma({
        nome: dados.nome,
        nomeAgencia: dados.nomeAgencia,
        link: `${appUrl}/ativar?token=${token}`,
      }),
    });
  } catch (err) {
    console.error("[iniciarTrial] erro ao enviar e-mail:", err);
  }

  revalidatePath("/");
  return { ok: true, token };
}
