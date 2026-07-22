"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgenciaAdmin, requireAgenciaMember } from "@/lib/auth/session";
import { buildAuthUrl, listAccounts } from "@/lib/meta-oauth";
import { importarMetricasMeta } from "@/lib/meta";
import { encryptToken, decryptString } from "@/lib/crypto";
import type { MetaProvider, MetricasImportadas } from "@/types/database";

type ConnectResult = { ok: true; url: string } | { ok: false; error: string };
type SimpleResult = { ok?: true; error?: string };
type ImportResult =
  | { ok: true; metricas: MetricasImportadas }
  | { ok: false; error: string };

const providerSchema = z.enum(["instagram", "facebook"]);

/**
 * Inicia o OAuth da Meta: valida que o cliente pertence à agência e devolve a
 * URL de autorização para o browser redirecionar. Apenas admin da agência.
 */
export async function iniciarMetaOAuthAction(
  clienteId: string,
  providerRaw: string
): Promise<ConnectResult> {
  const session = await requireAgenciaAdmin();
  const parsed = providerSchema.safeParse(providerRaw);
  if (!parsed.success) return { ok: false, error: "Plataforma inválida." };
  const provider = parsed.data as MetaProvider;

  const supabase = createClient();
  const { data: cli } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();
  if (!cli) return { ok: false, error: "Cliente não encontrado." };

  const url = buildAuthUrl({
    clienteId,
    provider,
    agenciaId: session.profile.agencia_id!,
    userId: session.id,
  });
  return { ok: true, url };
}

/**
 * Remove a conexão OAuth de um provider. Apenas admin da agência.
 */
export async function desconectarMetaOAuthAction(
  clienteId: string,
  providerRaw: string
): Promise<SimpleResult> {
  const session = await requireAgenciaAdmin();
  const parsed = providerSchema.safeParse(providerRaw);
  if (!parsed.success) return { error: "Plataforma inválida." };
  const provider = parsed.data as MetaProvider;

  const admin = createAdminClient();
  const { error } = await admin
    .from("cliente_oauth_contas")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("provider", provider)
    .eq("agencia_id", session.profile.agencia_id!);

  revalidatePath(`/admin/clientes/${clienteId}`);
  if (error) return { error: "Erro ao desconectar a conta." };
  return { ok: true };
}

const importSchema = z.object({
  cliente_id: z.string().uuid(),
  provider: providerSchema,
  mes_referencia: z.string().min(7), // YYYY-MM-DD
});

/**
 * Importa as métricas do mês selecionado da Meta e devolve o objeto parcial
 * para o formulário pré-preencher. Admin ou membro da agência.
 */
export async function importarMetricasAction(formData: FormData): Promise<ImportResult> {
  const session = await requireAgenciaMember();
  const parsed = importSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const { data: cli } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", parsed.data.cliente_id)
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();
  if (!cli) return { ok: false, error: "Cliente não encontrado." };

  return importarMetricasMeta({
    clienteId: parsed.data.cliente_id,
    provider: parsed.data.provider as MetaProvider,
    mesReferencia: parsed.data.mes_referencia,
  });
}

/* -------------------------------------------------------------------------- */
/* Seleção de Página/Instagram após o OAuth                                    */
/* -------------------------------------------------------------------------- */

const SELECT_COOKIE = "meta_select";

/**
 * Grava a conta Meta selecionada pelo admin no seletor pós-OAuth. Lê o cookie
 * cifrado `meta_select` (válido por 5 min), re-busca as Páginas com o token
 * do usuário (não confia em nada vindo do client além do pageId), escolhe o
 * external_id/token conforme o provider, cifra e faz upsert. Apenas admin.
 */
export async function selecionarContaMetaAction(formData: FormData): Promise<SimpleResult> {
  const session = await requireAgenciaAdmin();
  const cookieStore = cookies();
  const blob = cookieStore.get(SELECT_COOKIE)?.value;
  if (!blob) return { error: "Sessão de seleção expirada. Conecte novamente." };

  let ctx: {
    token: string;
    expiresAt: string | null;
    scopes: string;
    provider: MetaProvider;
    clienteId: string;
    agenciaId: string;
    userId: string;
  };
  try {
    ctx = JSON.parse(decryptString(blob));
  } catch {
    return { error: "Sessão de seleção inválida. Conecte novamente." };
  }

  // Validação de posse: o cookie só pode ser usado pela agência/usuário donos.
  if (ctx.agenciaId !== session.profile.agencia_id || ctx.userId !== session.id) {
    return { error: "Sessão de seleção não pertence a esta agência." };
  }

  // O provider vem do OAuth (ctx), não do client — evita spoofing.
  const pageId = String(formData.get("page_id") ?? "").trim();
  const provider = ctx.provider;
  if (!pageId) return { error: "Selecione uma conta." };

  // Re-busca as Páginas (tokens frescos) — não confia no pageId sozinho.
  let contas;
  try {
    contas = await listAccounts(ctx.token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao listar Páginas.";
    return { error: msg };
  }
  const page = contas.find((c) => c.pageId === pageId);
  if (!page) return { error: "Página não encontrada. Conecte novamente." };

  let externalId: string;
  let handle: string | null;
  let name: string;
  let pictureUrl: string | null;
  let tokenToStore: string;
  if (provider === "instagram") {
    if (!page.igUserId) {
      return {
        error: "Essa Página não tem conta comercial do Instagram vinculada.",
      };
    }
    externalId = page.igUserId;
    handle = page.igUsername;
    name = page.pageName;
    pictureUrl = page.igPictureUrl ?? page.pagePictureUrl;
    tokenToStore = ctx.token; // user token válido p/ insights do ig_user_id
  } else {
    externalId = page.pageId;
    handle = null;
    name = page.pageName;
    pictureUrl = page.pagePictureUrl;
    tokenToStore = page.pageAccessToken;
  }

  const enc = encryptToken(tokenToStore);
  const admin = createAdminClient();
  const { error } = await admin
    .from("cliente_oauth_contas")
    .upsert(
      {
        cliente_id: ctx.clienteId,
        agencia_id: ctx.agenciaId,
        provider,
        external_id: externalId,
        access_token_ciphertext: enc.ciphertext,
        access_token_iv: enc.iv,
        access_token_tag: enc.tag,
        token_expires_at: ctx.expiresAt ?? null,
        scopes: ctx.scopes,
        account_handle: handle,
        account_name: name,
        account_picture_url: pictureUrl,
        connected_by: ctx.userId,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cliente_id,provider" }
    );

  // Limpa o cookie de seleção independente do resultado.
  cookieStore.delete(SELECT_COOKIE);
  if (error) return { error: "Erro ao salvar a conta: " + error.message };

  revalidatePath(`/admin/clientes/${ctx.clienteId}`);
  return { ok: true };
}

/**
 * Cancela a seleção (descarta o cookie) sem gravar nada.
 */
export async function cancelarSelecaoMetaAction(): Promise<SimpleResult> {
  cookies().delete(SELECT_COOKIE);
  return { ok: true };
}