"use server";

import { revalidatePath, revalidateTag } from "next/cache";
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
  revalidateTag("planos");
  return { ok: true };
}

// ============================================================================
// PLATFORM CONFIG — logos da plataforma (claro/escuro)
// ============================================================================

const salvarLogoPlataformaSchema = z.object({
  logo_url_light: z.string().url().nullable().or(z.literal("")),
  logo_url_dark: z.string().url().nullable().or(z.literal("")),
});

export type SalvarLogoPlataformaState = { error?: string; ok?: boolean } | undefined;

export async function salvarLogoPlataformaAction(
  _prev: SalvarLogoPlataformaState,
  formData: FormData
): Promise<SalvarLogoPlataformaState> {
  await requireSuperAdmin();
  const parsed = salvarLogoPlataformaSchema.safeParse({
    logo_url_light: formData.get("logo_url_light") || null,
    logo_url_dark: formData.get("logo_url_dark") || null,
  });
  if (!parsed.success) return { error: "URLs de logo inválidas." };

  // "" vira null (logo removida).
  const logo_url_light = parsed.data.logo_url_light || null;
  const logo_url_dark = parsed.data.logo_url_dark || null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_config")
    .upsert(
      { id: "singleton", logo_url_light, logo_url_dark },
      { onConflict: "id" }
    );
  if (error) return { error: error.message };

  // Revalida tudo: a logo aparece em landing, login, checkout, painel etc.
  revalidatePath("/", "layout");
  revalidatePath("/super-admin/configuracoes");
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
  // Campos opcionais vazios viram NULL (importante p/ cnpj, que tem constraint
  // UNIQUE: "" colidiria com outra agência em branco; NULL não colide).
  const { data: ag, error: agErr } = await admin
    .from("agencias")
    .insert({
      nome_fantasia: parsed.data.nome_fantasia,
      razao_social: parsed.data.razao_social?.trim() || null,
      cnpj: parsed.data.cnpj?.trim() || null,
      email_contato: parsed.data.email_contato,
      telefone: parsed.data.telefone?.trim() || null,
      status: "ativa",
      plano: parsed.data.plano,
    })
    .select("id")
    .single();
  if (agErr || !ag) {
    await admin.auth.admin.deleteUser(signData.user.id).catch(() => {});
    const msg = agErr?.message ?? "Erro ao criar agência.";
    // Mensagem amigável para duplicidade de CNPJ (constraint agencias_cnpj_key).
    if (msg.includes("agencias_cnpj_key")) {
      return {
        ok: false,
        error:
          parsed.data.cnpj?.trim()
            ? "CNPJ já cadastrado em outra agência."
            : "CNPJ em branco conflita com outra agência (limpe os CNPJs em branco ou informe um CNPJ).",
      };
    }
    return { ok: false, error: msg };
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

// ============================================================================
// AGÊNCIA: excluir (remove auth users, storage e a agência em cascata)
// ============================================================================
//
// O `agencias(id) on delete cascade` derruba todas as tabelas públicas
// (usuarios, clientes, planejamentos, contratos, faturas, briefings,
// assinatura_ativa, etc.). Mas as contas em `auth.users` (admin da agência +
// logins dos clientes) NÃO são removidas pelo cascade — ficariam órfãs.
// Por isso coletamos os user_ids ANTES de excluir e os removemos do Auth.
// Também limpamos (best-effort) os arquivos do Storage sob o prefixo da agência.

const BUCKETS_PARA_LIMPAR = [
  "agency-assets",
  "client-assets",
  "contracts",
  "briefings",
  "reports",
  "invoices",
  "content-plans",
];

async function limparStorageAgencia(admin: ReturnType<typeof createAdminClient>, agenciaId: string) {
  for (const bucket of BUCKETS_PARA_LIMPAR) {
    try {
      // Lista recursiva sob o prefixo "agenciaId/".
      const { data: objs, error } = await admin.storage.from(bucket).list(agenciaId, {
        limit: 1000,
        offset: 0,
      });
      if (error || !objs || objs.length === 0) continue;
      // O list de um nível não é recursivo; coletamos caminhos dos objetos
      // (prefixo = subpasta). Para simplicidade, removemos por subpasta.
      const paths: string[] = [];
      for (const obj of objs) {
        if (!obj.id) {
          // É uma "pasta" (prefixo) — lista dentro dela.
          const { data: sub } = await admin.storage
            .from(bucket)
            .list(`${agenciaId}/${obj.name}`, { limit: 1000, offset: 0 });
          for (const s of sub ?? []) {
            if (s.id) paths.push(`${agenciaId}/${obj.name}/${s.name}`);
          }
        } else {
          paths.push(`${agenciaId}/${obj.name}`);
        }
      }
      if (paths.length > 0) {
        // remove aceita no máx 1000 paths por chamada.
        for (let i = 0; i < paths.length; i += 1000) {
          await admin.storage.from(bucket).remove(paths.slice(i, i + 1000));
        }
      }
    } catch {
      // Storage é best-effort: não bloqueia a exclusão da agência.
    }
  }
}

export async function deletarAgenciaAction(agenciaId: string) {
  await requireSuperAdmin();
  const admin = createAdminClient();

  // 1) Coleta user_ids (staff da agência + logins de clientes) ANTES de excluir,
  //    pois o cascade apagará as linhas de usuarios/clientes.
  const { data: staff } = await admin
    .from("usuarios")
    .select("user_id")
    .eq("agencia_id", agenciaId);
  const { data: clientesUsers } = await admin
    .from("clientes")
    .select("user_id")
    .eq("agencia_id", agenciaId);

  const userIds = new Set<string>();
  for (const u of staff ?? []) if (u.user_id) userIds.add(u.user_id);
  for (const c of clientesUsers ?? []) if (c.user_id) userIds.add(c.user_id);

  // 2) Limpa storage (best-effort) sob o prefixo da agência.
  await limparStorageAgencia(admin, agenciaId);

  // 3) Exclui a agência — cascade derruba todas as tabelas públicas.
  const { error } = await admin.from("agencias").delete().eq("id", agenciaId);
  if (error) return { ok: false, error: error.message };

  // 4) Remove as contas do Auth (admin da agência + clientes).
  for (const uid of userIds) {
    try {
      await admin.auth.admin.deleteUser(uid);
    } catch {
      // ignora se já não existir
    }
  }

  revalidatePath("/super-admin/agencias");
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/financeiro");
  return { ok: true };
}
