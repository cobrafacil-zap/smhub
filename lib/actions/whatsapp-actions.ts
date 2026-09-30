"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgenciaAdmin, requireAgenciaMember } from "@/lib/auth/session";
import {
  getWhatsappConexao,
  salvarWhatsappConexao,
  marcarWhatsappStatus,
  whatsappStatus,
  whatsappCriarInstancia,
  whatsappQrCode,
  whatsappDesconectar,
  whatsappListarGrupos,
  WhatsappNaoConfiguradoError,
} from "@/lib/whatsapp";

const conexaoSchema = z.object({
  api_url: z.string().url("URL inválida (ex.: https://evolution.suaagencia.com)."),
  instance: z
    .string()
    .min(2, "Nome da instância muito curto.")
    .max(60)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letras, números, - ou _."),
  api_key: z.string().min(4, "API key inválida."),
});

/** Salva a config da instância dedicada (cifra a key). Só admin. */
export async function salvarWhatsappConexaoAction(formData: FormData) {
  const session = await requireAgenciaAdmin();
  const parsed = conexaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await salvarWhatsappConexao(session.profile.agencia_id!, {
      apiUrl: parsed.data.api_url,
      instance: parsed.data.instance,
      apiKey: parsed.data.api_key,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao salvar." };
  }
  revalidatePath("/admin/configuracoes");
  return { ok: true };
}

/** Cria a instância no servidor Evolution. Só admin. */
export async function criarWhatsappInstanciaAction() {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;
  try {
    const cfg = await getWhatsappConexao(aid);
    await whatsappCriarInstancia(cfg);
    await marcarWhatsappStatus(aid, "connecting", false);
  } catch (err) {
    if (err instanceof WhatsappNaoConfiguradoError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Erro ao criar instância." };
  }
  revalidatePath("/admin/configuracoes");
  return { ok: true };
}

/** Gera o QR de pareamento. Só admin. Retorna base64/otpauth p/ <img>. */
export async function gerarWhatsappQrAction(): Promise<
  { ok: true; qr: string | null } | { error: string }
> {
  const session = await requireAgenciaAdmin();
  try {
    const cfg = await getWhatsappConexao(session.profile.agencia_id!);
    const { qr } = await whatsappQrCode(cfg);
    return { ok: true, qr };
  } catch (err) {
    if (err instanceof WhatsappNaoConfiguradoError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Erro ao gerar QR." };
  }
}

/** Consulta o estado e atualiza o status local. Só admin. */
export async function verificarWhatsappStatusAction() {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;
  try {
    const cfg = await getWhatsappConexao(aid);
    const state = await whatsappStatus(cfg);
    await marcarWhatsappStatus(aid, state === "open" ? "conectado" : state, state === "open");
    return { ok: true as const, state };
  } catch (err) {
    if (err instanceof WhatsappNaoConfiguradoError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Erro ao verificar status." };
  }
}

/** Desconecta (logout) a instância. Só admin. */
export async function desconectarWhatsappAction() {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;
  try {
    const cfg = await getWhatsappConexao(aid);
    await whatsappDesconectar(cfg);
    await marcarWhatsappStatus(aid, "desconectado", false);
  } catch (err) {
    if (err instanceof WhatsappNaoConfiguradoError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Erro ao desconectar." };
  }
  revalidatePath("/admin/configuracoes");
  return { ok: true };
}

/** Lista os grupos da instância p/ escolher o JID do cliente. Admin ou membro. */
export async function listarWhatsappGruposAction() {
  const session = await requireAgenciaMember();
  try {
    const cfg = await getWhatsappConexao(session.profile.agencia_id!);
    const grupos = await whatsappListarGrupos(cfg);
    return { ok: true as const, grupos };
  } catch (err) {
    if (err instanceof WhatsappNaoConfiguradoError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Erro ao listar grupos." };
  }
}

const grupoSchema = z.object({
  cliente_id: z.string().uuid(),
  jid: z
    .string()
    .trim()
    .max(80)
    .refine((v) => v === "" || v.endsWith("@g.us"), "JID de grupo termina com @g.us."),
});

/** Define o grupo de WhatsApp do cliente (aba Informações). Admin ou membro. */
export async function salvarGrupoWhatsappAction(formData: FormData) {
  const session = await requireAgenciaMember();
  const parsed = grupoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "JID inválido." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("clientes")
    .update({ whatsapp_group_jid: parsed.data.jid || null })
    .eq("id", parsed.data.cliente_id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: "Erro ao salvar o grupo." };
  revalidatePath(`/admin/clientes/${parsed.data.cliente_id}`);
  return { ok: true };
}
