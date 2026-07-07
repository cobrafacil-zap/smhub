// SERVER-ONLY — não importar em client components.
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { graphGet, refreshLongLivedToken, type MetaProvider } from "@/lib/meta-oauth";
import type { ClienteOauthConta } from "@/types/database";

/**
 * Importação sob demanda de métricas da Meta Graph API para relatórios.
 * Carrega o token OAuth (cifrado) do cliente, renova se estiver perto de expirar,
 * chama os endpoints de insights do Instagram/Facebook e agrega o mês.
 */

export type MetricasImportadas = {
  seguidores_inicio?: number;
  seguidores_fim?: number;
  seguindo?: number;
  alcance_total?: number;
  impressoes?: number;
  total_posts?: number;
  total_reels?: number;
  total_stories?: number;
  total_curtidas?: number;
  comentarios?: number;
  cliques_link?: number;
  mensagens?: number;
  posts_feitos?: number;
};

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // renova se faltar < 7 dias
const META_MAX_WINDOW_DAYS = 30; // janela máxima de insights por chamada

type Result<T> = { ok: true; metricas: T } | { ok: false; error: string };

/* -------------------------------------------------------------------------- */
/* Helpers de data                                                            */
/* -------------------------------------------------------------------------- */

function monthRange(mesReferencia: string): { since: Date; until: Date } {
  // mesReferencia = "YYYY-MM-DD" (dia 1, como relatorios armazena)
  const start = new Date(`${mesReferencia.slice(0, 7)}-01T00:00:00Z`);
  const until = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { since: start, until };
}

/** Divide [since, until) em janelas de até 30 dias (Meta limita insights). */
function splitWindows(since: Date, until: Date): Array<{ since: Date; until: Date }> {
  const windows: Array<{ since: Date; until: Date }> = [];
  let cursor = new Date(since);
  while (cursor < until) {
    const next = new Date(cursor);
    next.setUTCDate(next.getUTCDate() + META_MAX_WINDOW_DAYS);
    if (next > until) next.setTime(until.getTime());
    windows.push({ since: cursor, until: next });
    cursor = next;
  }
  return windows;
}

function toUnix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

/* -------------------------------------------------------------------------- */
/* Token: carrega, decifra, renova se preciso                                 */
/* -------------------------------------------------------------------------- */

async function loadValidToken(
  clienteId: string,
  provider: MetaProvider
): Promise<{ token: string; row: ClienteOauthConta } | { error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cliente_oauth_contas")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) return { error: "Erro ao ler conexão." };
  if (!data) return { error: `Conecte a conta ${provider} antes de importar.` };

  const row = data as ClienteOauthConta;
  let token = decryptToken(
    row.access_token_ciphertext,
    row.access_token_iv,
    row.access_token_tag
  );

  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : null;
  const needsRefresh =
    expiresAt === null ? false : expiresAt - Date.now() < REFRESH_WINDOW_MS;

  if (needsRefresh) {
    try {
      const refreshed = await refreshLongLivedToken(token);
      const enc = encryptToken(refreshed.access_token);
      await admin
        .from("cliente_oauth_contas")
        .update({
          access_token_ciphertext: enc.ciphertext,
          access_token_iv: enc.iv,
          access_token_tag: enc.tag,
          token_expires_at: refreshed.expires_at?.toISOString() ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      token = refreshed.access_token;
    } catch {
      return {
        error:
          "Token expirado e não foi possível renovar. Reconecte a conta na aba Informações.",
      };
    }
  }

  return { token, row };
}

/* -------------------------------------------------------------------------- */
/* Instagram                                                                   */
/* -------------------------------------------------------------------------- */

interface IgInsightsResponse {
  data: Array<{
    name: string;
    values: Array<{ value: number; end_time?: string }>;
  }>;
}

async function fetchIgInsights(
  igUserId: string,
  token: string,
  since: Date,
  until: Date
): Promise<MetricasImportadas> {
  const metricas: MetricasImportadas = {};
  const windows = splitWindows(since, until);

  let reach = 0;
  let impressions = 0;
  let profileViews = 0;
  let contacts = 0; // email + phone + text
  let firstFollowers: number | null = null;
  let lastFollowers: number | null = null;

  for (const w of windows) {
    const res = (await graphGet(`/${igUserId}/insights`, {
      access_token: token,
      metric:
        "reach,impressions,follower_count,profile_views,email_contacts,phone_call_clicks,text_message_clicks",
      period: "day",
      since: String(toUnix(w.since)),
      until: String(toUnix(w.until)),
    })) as IgInsightsResponse;

    for (const m of res.data ?? []) {
      for (const v of m.values ?? []) {
        const val = Number(v.value) || 0;
        if (m.name === "reach") reach += val;
        else if (m.name === "impressions") impressions += val;
        else if (m.name === "profile_views") profileViews += val;
        else if (
          m.name === "email_contacts" ||
          m.name === "phone_call_clicks" ||
          m.name === "text_message_clicks"
        ) {
          contacts += val;
        } else if (m.name === "follower_count") {
          if (firstFollowers === null) firstFollowers = val;
          lastFollowers = val;
        }
      }
    }
  }

  metricas.alcance_total = reach;
  metricas.impressoes = impressions;
  metricas.cliques_link = profileViews; // aproximação (visitas ao perfil)
  metricas.mensagens = contacts;
  if (lastFollowers !== null) metricas.seguidores_fim = lastFollowers;
  if (firstFollowers !== null) metricas.seguidores_inicio = firstFollowers;

  // Perfil atual (followers/follows/media_count)
  const profile = (await graphGet(`/${igUserId}`, {
    access_token: token,
    fields: "followers_count,follows_count,media_count",
  })) as {
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
  };
  if (typeof profile.followers_count === "number")
    metricas.seguidores_fim = profile.followers_count; // valor mais confiável que insights
  if (typeof profile.follows_count === "number") metricas.seguindo = profile.follows_count;

  // Mídia do período: conta por tipo + soma curtidas/comentários
  let posts = 0;
  let reels = 0;
  let stories = 0;
  let curtidas = 0;
  let comentarios = 0;
  let mediaCount = 0;

  for (const w of windows) {
    let url: string | null = `/${igUserId}/media?fields=id,media_type,product_type,like_count,comments_count&since=${toUnix(
      w.since
    )}&until=${toUnix(w.until)}&access_token=${encodeURIComponent(token)}`;
    while (url) {
      const full = url.startsWith("http")
        ? url
        : `https://graph.facebook.com/v19.0${url}`;
      const res = await fetch(full, { cache: "no-store" });
      const json = (await res.json()) as {
        data?: Array<{
          media_type: string;
          product_type?: string;
          like_count?: number;
          comments_count?: number;
        }>;
        paging?: { next?: string };
      };
      for (const md of json.data ?? []) {
        mediaCount++;
        curtidas += Number(md.like_count) || 0;
        comentarios += Number(md.comments_count) || 0;
        const isReel = md.product_type === "REELS";
        const isStory = md.product_type === "STORY";
        if (isReel) reels++;
        else if (isStory) stories++;
        else posts++;
      }
      url = json.paging?.next ?? null;
    }
  }

  metricas.total_curtidas = curtidas;
  metricas.comentarios = comentarios;
  metricas.total_reels = reels;
  metricas.total_stories = stories;
  metricas.total_posts = posts;
  metricas.posts_feitos = mediaCount;

  return metricas;
}

/* -------------------------------------------------------------------------- */
/* Facebook                                                                    */
/* -------------------------------------------------------------------------- */

interface FbInsightsResponse {
  data: Array<{
    name: string;
    values: Array<{ value: number }>;
  }>;
}

async function fetchFbInsights(
  pageId: string,
  token: string,
  since: Date,
  until: Date
): Promise<MetricasImportadas> {
  const metricas: MetricasImportadas = {};
  const windows = splitWindows(since, until);

  let reach = 0;
  let impressions = 0;
  let reactions = 0;
  let fanAdds = 0;

  for (const w of windows) {
    const res = (await graphGet(`/${pageId}/insights`, {
      access_token: token,
      metric:
        "page_impressions_unique,page_impressions,page_actions_post_reactions_total,page_fan_adds",
      period: "day",
      since: String(toUnix(w.since)),
      until: String(toUnix(w.until)),
    })) as FbInsightsResponse;

    for (const m of res.data ?? []) {
      for (const v of m.values ?? []) {
        const val = Number(v.value) || 0;
        if (m.name === "page_impressions_unique") reach += val;
        else if (m.name === "page_impressions") impressions += val;
        else if (m.name === "page_actions_post_reactions_total") reactions += val;
        else if (m.name === "page_fan_adds") fanAdds += val;
      }
    }
  }

  metricas.alcance_total = reach;
  metricas.impressoes = impressions;
  metricas.total_curtidas = reactions;

  // fan_count atual + estimativa do início
  const page = (await graphGet(`/${pageId}`, {
    access_token: token,
    fields: "fan_count,followers_count",
  })) as { fan_count?: number; followers_count?: number };

  if (typeof page.fan_count === "number") {
    metricas.seguidores_fim = page.fan_count;
    metricas.seguidores_inicio = Math.max(0, page.fan_count - fanAdds);
  }

  // Contagem de posts no período
  let postsFeitos = 0;
  for (const w of windows) {
    let url: string | null = `/${pageId}/posts?fields=id&since=${toUnix(
      w.since
    )}&until=${toUnix(w.until)}&access_token=${encodeURIComponent(token)}`;
    while (url) {
      const full = url.startsWith("http")
        ? url
        : `https://graph.facebook.com/v19.0${url}`;
      const res = await fetch(full, { cache: "no-store" });
      const json = (await res.json()) as {
        data?: unknown[];
        paging?: { next?: string };
      };
      postsFeitos += json.data?.length ?? 0;
      url = json.paging?.next ?? null;
    }
  }
  metricas.posts_feitos = postsFeitos;

  // FB page insights não expõe "comentários" limpo — deixamos p/ o admin preencher.
  return metricas;
}

/* -------------------------------------------------------------------------- */
/* API pública                                                                 */
/* -------------------------------------------------------------------------- */

export async function importarMetricasMeta(args: {
  clienteId: string;
  provider: MetaProvider;
  mesReferencia: string;
}): Promise<Result<MetricasImportadas>> {
  const loaded = await loadValidToken(args.clienteId, args.provider);
  if ("error" in loaded) return { ok: false, error: loaded.error };

  const { token, row } = loaded;
  const { since, until } = monthRange(args.mesReferencia);

  try {
    const metricas =
      args.provider === "instagram"
        ? await fetchIgInsights(row.external_id, token, since, until)
        : await fetchFbInsights(row.external_id, token, since, until);
    return { ok: true, metricas };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar métricas da Meta.";
    return { ok: false, error: msg };
  }
}