import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyState, encryptToken } from "@/lib/crypto";
import {
  exchangeCodeForLongLivedToken,
  discoverInstagramBusinessAccount,
  resolveFacebookPage,
} from "@/lib/meta-oauth";

/**
 * Callback do OAuth da Meta (Instagram + Facebook).
 *
 * Rota auth-required: se o admin não estiver logado, manda para /login
 * preservando a URL completa em `next` (o middleware devolve aqui depois).
 *
 * Verifica o `state` (HMAC + expiração + userId), troca o `code` por um
 * long-lived token, descobre a conta IG/FB, cifra o token e faz upsert em
 * `cliente_oauth_contas`.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  // 1) Sessão obrigatória
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = encodeURIComponent(req.url);
    return NextResponse.redirect(new URL(`/login?next=${next}`, origin));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/admin/clientes?meta_error=${encodeURIComponent(errorParam)}`, origin)
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/admin/clientes?meta_error=missing_params", origin));
  }

  // 2) Verifica state (HMAC + exp + binding de userId)
  const payload = verifyState(state);
  if (!payload || payload.userId !== user.id) {
    return NextResponse.redirect(new URL("/admin/clientes?meta_error=invalid_state", origin));
  }

  // 3) Troca code → long-lived token
  let tokens;
  try {
    tokens = await exchangeCodeForLongLivedToken(code);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "exchange_failed";
    return NextResponse.redirect(
      new URL(`/admin/clientes?meta_error=${encodeURIComponent(msg)}`, origin)
    );
  }

  // 4) Descobre a conta (IG Business Account ou FB Page)
  let externalId: string;
  let handle: string | null;
  let name: string;
  let tokenToStore: string;

  try {
    if (payload.provider === "instagram") {
      const r = await discoverInstagramBusinessAccount(tokens.access_token);
      externalId = r.igUserId;
      handle = r.igHandle;
      name = r.pageName;
      tokenToStore = tokens.access_token; // user token válido p/ insights do ig_user_id
    } else {
      const r = await resolveFacebookPage(tokens.access_token);
      externalId = r.pageId;
      handle = null;
      name = r.pageName;
      tokenToStore = r.pageAccessToken;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "discovery_failed";
    return NextResponse.redirect(
      new URL(
        `/admin/clientes/${payload.clienteId}?tab=info&meta_error=${encodeURIComponent(msg)}`,
        origin
      )
    );
  }

  // 5) Cifra e grava
  const enc = encryptToken(tokenToStore);
  const admin = createAdminClient();
  const { error } = await admin
    .from("cliente_oauth_contas")
    .upsert(
      {
        cliente_id: payload.clienteId,
        agencia_id: payload.agenciaId,
        provider: payload.provider,
        external_id: externalId,
        access_token_ciphertext: enc.ciphertext,
        access_token_iv: enc.iv,
        access_token_tag: enc.tag,
        token_expires_at: tokens.expires_at ? tokens.expires_at.toISOString() : null,
        scopes: tokens.scopes,
        account_handle: handle,
        account_name: name,
        connected_by: user.id,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cliente_id,provider" }
    );

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/admin/clientes/${payload.clienteId}?tab=info&meta_error=${encodeURIComponent(error.message)}`,
        origin
      )
    );
  }

  return NextResponse.redirect(
    new URL(`/admin/clientes/${payload.clienteId}?tab=info&meta=connected`, origin)
  );
}