import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyState, encryptString } from "@/lib/crypto";
import { exchangeCodeForLongLivedToken } from "@/lib/meta-oauth";

/**
 * Callback do OAuth da Meta (Instagram + Facebook).
 *
 * Rota auth-required: se o admin não estiver logado, manda para /login
 * preservando a URL completa em `next` (o middleware devolve aqui depois).
 *
 * Verifica o `state` (HMAC + expiração + userId), troca o `code` por um
 * long-lived token e guarda-o num cookie CIFRADO de curta duração
 * (`meta_select`). A seguir redireciona pra aba Informações do cliente com
 * `?meta_select=1`, onde o admin escolhe qual Página/Instagram conectar
 * (seletor) — a gravação final acontece em `selecionarContaMetaAction`.
 */

const SELECT_COOKIE = "meta_select";
const SELECT_COOKIE_TTL = 5 * 60; // 5 min

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

  // 4) Guarda o contexto da seleção num cookie cifrado e manda pro seletor.
  const ctx = {
    token: tokens.access_token,
    expiresAt: tokens.expires_at ? tokens.expires_at.toISOString() : null,
    scopes: tokens.scopes,
    provider: payload.provider,
    clienteId: payload.clienteId,
    agenciaId: payload.agenciaId,
    userId: user.id,
  };
  const blob = encryptString(JSON.stringify(ctx));

  const redirectUrl = new URL(
    `/admin/clientes/${payload.clienteId}?tab=info&meta_select=1`,
    origin
  );
  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set(SELECT_COOKIE, blob, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: SELECT_COOKIE_TTL,
  });
  return res;
}