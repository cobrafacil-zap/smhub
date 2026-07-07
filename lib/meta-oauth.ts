// SERVER-ONLY — não importar em client components.
import { signState } from "@/lib/crypto";

/**
 * OAuth da Meta (Instagram + Facebook Graph API).
 *
 * Fluxo:
 *   buildAuthUrl() → redirect do browser para o dialog da Meta
 *   ← callback com `code` + `state`
 *   exchangeCodeForLongLivedToken(code) → token long-lived (~60 dias)
 *   discoverInstagramBusinessAccount() | resolveFacebookPage()
 */

const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const DIALOG_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const STATE_TTL_MS = 10 * 60 * 1000; // 10 min

/** Scopes pedidos no OAuth. Necessários para App Review em produção. */
export const META_SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "business_management",
] as const;

export const META_REDIRECT_PATH = "/auth/meta/callback";

export type MetaProvider = "instagram" | "facebook";

function getAppId(): string {
  const id = process.env.META_APP_ID;
  if (!id) throw new Error("META_APP_ID ausente.");
  return id;
}

function getAppSecret(): string {
  const secret = process.env.META_APP_SECRET;
  if (!secret) throw new Error("META_APP_SECRET ausente.");
  return secret;
}

export function metaRedirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${META_REDIRECT_PATH}`;
}

export function buildAuthUrl(args: {
  clienteId: string;
  provider: MetaProvider;
  agenciaId: string;
  userId: string;
}): string {
  const state = signState(
    {
      clienteId: args.clienteId,
      provider: args.provider,
      agenciaId: args.agenciaId,
      userId: args.userId,
    },
    STATE_TTL_MS
  );
  const params = new URLSearchParams({
    client_id: getAppId(),
    redirect_uri: metaRedirectUri(),
    scope: META_SCOPES.join(","),
    state,
    response_type: "code",
  });
  return `${DIALOG_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number; // segundos (0/nulo = long-lived)
  scope?: string;
}

async function graphGet(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    const msg = (data?.error?.message as string) ?? `Meta API ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/**
 * Troca o `code` do callback por um long-lived user token (~60 dias).
 * 1) short-lived via code exchange
 * 2) long-lived via fb_exchange_token
 */
export async function exchangeCodeForLongLivedToken(code: string): Promise<{
  access_token: string;
  expires_at: Date | null;
  scopes: string;
}> {
  // 1) code → short-lived
  const shortParams = {
    client_id: getAppId(),
    client_secret: getAppSecret(),
    redirect_uri: metaRedirectUri(),
    code,
  };
  const short = (await graphGet("/oauth/access_token", shortParams)) as TokenResponse;

  // 2) short → long-lived
  const longParams = {
    grant_type: "fb_exchange_token",
    client_id: getAppId(),
    client_secret: getAppSecret(),
    fb_exchange_token: short.access_token,
  };
  const long = (await graphGet("/oauth/access_token", longParams)) as TokenResponse;

  // long-lived user tokens devolvem expires_in ~5184000 (60 dias); se 0/nulo, não expira.
  const expiresIn = long.expires_in && long.expires_in > 0 ? long.expires_in : null;
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000)
    : null;

  return {
    access_token: long.access_token,
    expires_at: expiresAt,
    scopes: long.scope ?? short.scope ?? META_SCOPES.join(","),
  };
}

/**
 * Renova um long-lived user token válido (devolve novo ~60 dias).
 * Lança se o token já expirou — nesse caso o admin precisa reconectar.
 */
export async function refreshLongLivedToken(token: string): Promise<{
  access_token: string;
  expires_at: Date | null;
}> {
  const long = (await graphGet("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: getAppId(),
    client_secret: getAppSecret(),
    fb_exchange_token: token,
  })) as TokenResponse;
  const expiresIn = long.expires_in && long.expires_in > 0 ? long.expires_in : null;
  return {
    access_token: long.access_token,
    expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
  };
}

interface AccountRow {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

interface MeAccountsResponse {
  data: AccountRow[];
}

/**
 * Descobre o Instagram Business Account ligado à primeira Página do usuário.
 * Requer que a conta IG seja Business/Creator e esteja vinculada a uma FB Page.
 */
export async function discoverInstagramBusinessAccount(userToken: string): Promise<{
  pageId: string;
  pageName: string;
  igUserId: string;
  igHandle: string | null;
}> {
  const accounts = (await graphGet("/me/accounts", {
    access_token: userToken,
    fields: "id,name,access_token,instagram_business_account",
  })) as MeAccountsResponse;

  const page = accounts.data?.find((p) => p.instagram_business_account?.id);
  if (!page) {
    throw new Error(
      "Nenhuma Página do Facebook com conta comercial do Instagram vinculada encontrada."
    );
  }
  const igUserId = page.instagram_business_account!.id;

  const ig = (await graphGet(`/${igUserId}`, {
    access_token: userToken,
    fields: "username,followers_count,follows_count,media_count",
  })) as { username?: string };

  return {
    pageId: page.id,
    pageName: page.name,
    igUserId,
    igHandle: ig.username ?? null,
  };
}

/**
 * Resolve a Página do Facebook (usa o page access token, preferível p/ insights).
 */
export async function resolveFacebookPage(userToken: string): Promise<{
  pageId: string;
  pageName: string;
  pageAccessToken: string;
}> {
  const accounts = (await graphGet("/me/accounts", {
    access_token: userToken,
    fields: "id,name,access_token",
  })) as MeAccountsResponse;

  const page = accounts.data?.[0];
  if (!page) {
    throw new Error("Nenhuma Página do Facebook encontrada para esta conta.");
  }
  return {
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
  };
}

/** Helper interno exportado p/ lib/meta.ts reusar. */
export { graphGet, GRAPH_BASE };