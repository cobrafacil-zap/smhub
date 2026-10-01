/**
 * Cliente Evolution API (WhatsApp) por agência — instância DEDICADA do SM Hub.
 *
 * Diferente do Painel GL (env global única), aqui cada agência tem sua linha
 * em `agencia_whatsapp_conexoes` (api_url/instance + api_key cifrada com
 * AES-256-GCM via lib/crypto, igual aos tokens Meta). SERVER-ONLY.
 *
 * Setup esperado (VPS da agência ou compartilhado):
 *   1. Evolution API rodando (docker evoapicloud/evolution-api).
 *   2. Admin cadastra URL + nome da instância + apikey em /admin/configuracoes
 *      (action `salvarWhatsappConexaoAction`) ou cria via `criarInstancia`.
 *   3. Escaneia o QR (action `gerarWhatsappQrAction`) e conecta.
 *   4. Cada cliente tem `clientes.whatsapp_group_jid` (@g.us) na InfoTab.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken, decryptToken } from "@/lib/crypto";

export class WhatsappNaoConfiguradoError extends Error {
  constructor() {
    super("WhatsApp não configurado. Conecte sua instância em Configurações.");
    this.name = "WhatsappNaoConfiguradoError";
  }
}

export interface WhatsappConexao {
  apiUrl: string;
  instance: string;
  apiKey: string;
}

function normalizarUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/** Lê e decifra a conexão da agência. Lança se não existir. */
export async function getWhatsappConexao(agenciaId: string): Promise<WhatsappConexao> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agencia_whatsapp_conexoes")
    .select("api_url, instance, api_key_ciphertext, api_key_iv, api_key_tag")
    .eq("agencia_id", agenciaId)
    .maybeSingle();
  if (error || !data) throw new WhatsappNaoConfiguradoError();
  const row = data as {
    api_url: string;
    instance: string;
    api_key_ciphertext: string;
    api_key_iv: string;
    api_key_tag: string;
  };
  const apiKey = decryptToken(row.api_key_ciphertext, row.api_key_iv, row.api_key_tag);
  return { apiUrl: normalizarUrl(row.api_url), instance: row.instance, apiKey };
}

/** Salva (upsert) a conexão cifrando a apikey. */
export async function salvarWhatsappConexao(
  agenciaId: string,
  input: { apiUrl: string; instance: string; apiKey: string }
): Promise<void> {
  const admin = createAdminClient();
  const enc = encryptToken(input.apiKey);
  const { error } = await admin.from("agencia_whatsapp_conexoes").upsert(
    {
      agencia_id: agenciaId,
      api_url: normalizarUrl(input.apiUrl),
      instance: input.instance.trim(),
      api_key_ciphertext: enc.ciphertext,
      api_key_iv: enc.iv,
      api_key_tag: enc.tag,
      status: "desconectado",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agencia_id" }
  );
  if (error) throw new Error(`Erro ao salvar conexão: ${error.message}`);
}

export async function marcarWhatsappStatus(
  agenciaId: string,
  status: string,
  connected: boolean
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("agencia_whatsapp_conexoes")
    .update({
      status,
      connected_at: connected ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("agencia_id", agenciaId);
}

async function evoFetch(
  cfg: WhatsappConexao,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${cfg.apiUrl}${path}`, {
    ...init,
    headers: {
      apikey: cfg.apiKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export type WhatsappInstanceState = "open" | "close" | "connecting" | "unknown";

/** GET /instance/connectionState/{instance} */
export async function whatsappStatus(cfg: WhatsappConexao): Promise<WhatsappInstanceState> {
  const res = await evoFetch(cfg, `/instance/connectionState/${cfg.instance}`);
  if (!res.ok) throw new Error(`Evolution status HTTP ${res.status}`);
  const json = (await res.json()) as { instance?: { state?: string } };
  const s = json.instance?.state ?? "unknown";
  if (s === "open") return "open";
  if (s === "close") return "close";
  if (s === "connecting") return "connecting";
  return "unknown";
}

/** POST /instance/create — cria a instância no servidor (Baileys/QR). */
export async function whatsappCriarInstancia(cfg: WhatsappConexao): Promise<unknown> {
  const res = await evoFetch(cfg, "/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: cfg.instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao criar instância (HTTP ${res.status}): ${txt.slice(0, 200)}`);
  }
  return res.json();
}

/** GET /instance/connect/{instance} — devolve {base64|code|qrcode} p/ exibir o QR. */
export async function whatsappQrCode(cfg: WhatsappConexao): Promise<{ qr: string | null; raw: unknown }> {
  const res = await evoFetch(cfg, `/instance/connect/${cfg.instance}`);
  if (!res.ok) throw new Error(`Evolution connect HTTP ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;
  const qr =
    (json.base64 as string | undefined) ??
    (json.code as string | undefined) ??
    (json.qrcode as string | undefined) ??
    null;
  return { qr, raw: json };
}

/** DELETE /instance/logout/{instance} */
export async function whatsappDesconectar(cfg: WhatsappConexao): Promise<void> {
  const res = await evoFetch(cfg, `/instance/logout/${cfg.instance}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Evolution logout HTTP ${res.status}`);
}

/** POST /message/sendText/{instance} {number, text, delay} */
export async function whatsappEnviarTexto(
  cfg: WhatsappConexao,
  jid: string,
  texto: string
): Promise<{ mensagemId: string | null; raw: unknown }> {
  const res = await evoFetch(cfg, `/message/sendText/${cfg.instance}`, {
    method: "POST",
    body: JSON.stringify({ number: jid, text: texto, delay: 800 }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha no envio (HTTP ${res.status}): ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { key?: { id?: string } };
  return { mensagemId: json.key?.id ?? null, raw: json };
}

export interface WhatsappGrupo {
  jid: string;
  nome: string;
  participantes?: number;
}

/** GET /group/fetchAllGroups/{instance} — lista grupos p/ escolher o JID. */
export async function whatsappListarGrupos(cfg: WhatsappConexao): Promise<WhatsappGrupo[]> {
  const res = await evoFetch(cfg, `/group/fetchAllGroups/${cfg.instance}?getParticipants=false`);
  if (!res.ok) throw new Error(`Evolution grupos HTTP ${res.status}`);
  const json = (await res.json()) as Array<{
    id?: string;
    subject?: string;
    name?: string;
    size?: number;
  }>;
  return (Array.isArray(json) ? json : [])
    .filter((g) => (g.id ?? "").endsWith("@g.us"))
    .map((g) => ({ jid: g.id!, nome: g.subject ?? g.name ?? g.id!, participantes: g.size }));
}
