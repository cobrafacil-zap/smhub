"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/session";

// ============================================================================
// AGÊNCIAS — plano + status
// ============================================================================

export async function toggleAgenciaAtivaAction(id: string, ativo: boolean) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  await admin.from("agencias").update({ status: ativo ? "ativa" : "suspensa" }).eq("id", id);
  revalidatePath("/super-admin/agencias");
  revalidatePath("/super-admin");
}

const atualizarPlanoSchema = z.object({
  id: z.string().uuid(),
  plano: z.enum(["basico", "pro", "enterprise"]),
});

export type AtualizarPlanoState = { error?: string; ok?: boolean } | undefined;

export async function atualizarPlanoAgenciaAction(
  _prev: AtualizarPlanoState,
  formData: FormData
): Promise<AtualizarPlanoState> {
  await requireSuperAdmin();
  const parsed = atualizarPlanoSchema.safeParse({
    id: formData.get("id"),
    plano: formData.get("plano"),
  });
  if (!parsed.success) return { error: "Dados inválidos." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("agencias")
    .update({ plano: parsed.data.plano })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath("/super-admin/agencias");
  revalidatePath("/super-admin/financeiro");
  revalidatePath("/super-admin");
  return { ok: true };
}

// ============================================================================
// PLANOS (configuração de preço pelo super-admin)
// ============================================================================

const atualizarPlanoValorSchema = z.object({
  id: z.enum(["basico", "pro", "enterprise"]),
  valor_mensal: z.coerce.number().min(0, "Valor deve ser positivo."),
  nome: z.string().min(2).optional(),
  descricao: z.string().optional().nullable(),
});

export type AtualizarPlanoValorState = { error?: string; ok?: boolean } | undefined;

export async function atualizarPlanoValorAction(
  _prev: AtualizarPlanoValorState,
  formData: FormData
): Promise<AtualizarPlanoValorState> {
  await requireSuperAdmin();
  const parsed = atualizarPlanoValorSchema.safeParse({
    id: formData.get("id"),
    valor_mensal: formData.get("valor_mensal"),
    nome: formData.get("nome") || undefined,
    descricao: formData.get("descricao") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("planos")
    .update({
      valor_mensal: parsed.data.valor_mensal,
      ...(parsed.data.nome ? { nome: parsed.data.nome } : {}),
      ...(parsed.data.descricao !== undefined ? { descricao: parsed.data.descricao } : {}),
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath("/super-admin/financeiro");
  return { ok: true };
}

// ============================================================================
// SUPER ADMINS — adicionar/remover
// ============================================================================

function gerarSenhaTemporaria(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let senha = "";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 10; i++) senha += chars[bytes[i] % chars.length];
  return senha;
}

const criarSuperAdminSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
});

export type CriarSuperAdminState =
  | { ok: true; email: string; senha: string; nome: string }
  | { ok: false; error: string }
  | undefined;

export async function criarSuperAdminAction(
  _prev: CriarSuperAdminState,
  formData: FormData
): Promise<CriarSuperAdminState> {
  await requireSuperAdmin();
  const parsed = criarSuperAdminSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  // Verifica se já existe
  const { data: exists } = await admin
    .from("super_admins")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (exists) return { ok: false, error: "Já existe um super-admin com esse e-mail." };

  const senha = gerarSenhaTemporaria();
  const { data: signData, error: signErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: parsed.data.nome, role: "super_admin" },
  });
  if (signErr || !signData.user) {
    return { ok: false, error: signErr?.message ?? "Erro ao criar usuário." };
  }

  const { error: insertErr } = await admin.from("super_admins").insert({
    user_id: signData.user.id,
    nome: parsed.data.nome,
    email: parsed.data.email,
    ativo: true,
  });
  if (insertErr) {
    await admin.auth.admin.deleteUser(signData.user.id);
    return { ok: false, error: insertErr.message };
  }

  revalidatePath("/super-admin/super-admins");
  return { ok: true, email: parsed.data.email, senha, nome: parsed.data.nome };
}

export async function toggleSuperAdminAtivoAction(id: string, ativo: boolean) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  await admin.from("super_admins").update({ ativo }).eq("id", id);
  revalidatePath("/super-admin/super-admins");
}

export async function deletarSuperAdminAction(id: string) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  // Pega user_id antes de deletar
  const { data: sa } = await admin
    .from("super_admins")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!sa) return;

  // Bloqueia deletar o último admin
  const { count } = await admin
    .from("super_admins")
    .select("id", { count: "exact", head: true })
    .eq("ativo", true);
  if ((count ?? 0) <= 1) return; // nunca fica sem nenhum

  await admin.from("super_admins").delete().eq("id", id);
  if (sa.user_id) {
    await admin.auth.admin.deleteUser(sa.user_id).catch(() => {});
  }
  revalidatePath("/super-admin/super-admins");
}

// ============================================================================
// AGÊNCIA: criar manualmente (cria user, agencia, usuario e trial de 7 dias)
// ============================================================================

function gerarSenhaTemp(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[bytes[i] % chars.length];
  return s;
}

const criarAgenciaSchema = z.object({
  nome_fantasia: z.string().min(2),
  razao_social: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  email_contato: z.string().email(),
  telefone: z.string().optional().nullable(),
  plano: z.enum(["basico", "pro", "enterprise"]).default("pro"),
  admin_nome: z.string().min(2),
  admin_email: z.string().email(),
});

export type CriarAgenciaState =
  | { ok: true; email: string; senha: string; agencia: string; admin: string }
  | { ok: false; error: string }
  | undefined;

export async function criarAgenciaAction(
  _prev: CriarAgenciaState,
  formData: FormData
): Promise<CriarAgenciaState> {
  await requireSuperAdmin();
  const parsed = criarAgenciaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const admin = createAdminClient();

  // 1) Verifica se email já existe
  const { data: existe } = await admin
    .from("usuarios")
    .select("id")
    .eq("email", parsed.data.admin_email)
    .maybeSingle();
  if (existe) return { ok: false, error: "Já existe um usuário com esse e-mail." };

  // 2) Cria auth user
  const senha = gerarSenhaTemp();
  const { data: signData, error: signErr } = await admin.auth.admin.createUser({
    email: parsed.data.admin_email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: parsed.data.admin_nome, role: "admin_agencia" },
  });
  if (signErr || !signData.user) {
    return { ok: false, error: signErr?.message ?? "Erro ao criar usuário." };
  }

  // 3) Cria agencia
  const { data: ag, error: agErr } = await admin
    .from("agencias")
    .insert({
      nome_fantasia: parsed.data.nome_fantasia,
      razao_social: parsed.data.razao_social ?? null,
      cnpj: parsed.data.cnpj ?? null,
      email_contato: parsed.data.email_contato,
      telefone: parsed.data.telefone ?? null,
      status: "ativa",
      plano: parsed.data.plano,
    })
    .select("id")
    .single();
  if (agErr || !ag) {
    await admin.auth.admin.deleteUser(signData.user.id).catch(() => {});
    return { ok: false, error: agErr?.message ?? "Erro ao criar agência." };
  }

  // 4) Cria usuario
  const { error: userErr } = await admin.from("usuarios").insert({
    user_id: signData.user.id,
    agencia_id: ag.id,
    nome: parsed.data.admin_nome,
    email: parsed.data.admin_email,
    role: "admin_agencia",
    ativo: true,
  });
  if (userErr) {
    await admin.auth.admin.deleteUser(signData.user.id).catch(() => {});
    await admin.from("agencias").delete().eq("id", ag.id);
    return { ok: false, error: userErr.message };
  }

  // 5) Cria assinatura trial de 7 dias
  const fim = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("assinatura_ativa").insert({
    agencia_id: ag.id,
    plano: parsed.data.plano,
    status: "trial",
    periodo_inicio: new Date().toISOString(),
    periodo_fim: fim,
    is_trial: true,
    grace_period_dias: 5,
  });

  revalidatePath("/super-admin/agencias");
  return {
    ok: true,
    email: parsed.data.admin_email,
    senha,
    agencia: parsed.data.nome_fantasia,
    admin: parsed.data.admin_nome,
  };
}
