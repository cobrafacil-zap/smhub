"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FOCUSED_CLIENTE_COOKIE,
  getFocusedClienteIdFromCookies,
  requireAgenciaMember,
  requireUser,
} from "@/lib/auth/session";

const uuidSchema = z.string().uuid();

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/cliente",
  // 8h: jornada típica de expediente; mesmo se "vazar" via DevTools,
  // a janela é curta. Refresh do JWT do Supabase (~1h) sobrevive.
  maxAge: 60 * 60 * 8,
};

/**
 * Define o cliente em foco para admin/membro da agência.
 * Recebe via FormData: `cliente_id` (uuid) e `next` (pathname).
 * Valida que o cliente pertence à agência antes de gravar o cookie.
 *
 * Se o `next` começa com `/admin/`, redireciona para `/admin/clientes/[id]`
 * (o admin sempre cai na ficha do novo cliente ao trocar). Caso contrário,
 * mantém o `next` original (caso do /cliente/*, que já está no cliente certo).
 */
export async function setFocusedClienteAction(formData: FormData): Promise<void> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;

  const rawId = String(formData.get("cliente_id") ?? "").trim();
  const next = String(formData.get("next") ?? "/cliente");
  // Evita open-redirect: só aceita caminhos internos começando com "/".
  const safeNext = next.startsWith("/") ? next : "/cliente";

  // Cliente vazio → "Visão geral da agência": limpa o cookie e sai.
  if (!rawId) {
    cookies().delete(FOCUSED_CLIENTE_COOKIE);
    redirect("/admin");
  }

  const parsed = uuidSchema.safeParse(rawId);
  if (!parsed.success) redirect("/admin/clientes?hint=cliente-invalido");

  const admin = createAdminClient();
  const { data } = await admin
    .from("clientes")
    .select("id")
    .eq("id", parsed.data)
    .eq("agencia_id", aid)
    .maybeSingle();
  if (!data) redirect("/admin/clientes?hint=cliente-indisponivel");

  cookies().set(FOCUSED_CLIENTE_COOKIE, parsed.data, {
    ...COOKIE_BASE,
    secure: process.env.NODE_ENV === "production",
  });

  // Se estamos no /admin/* (origem do switcher do Topbar admin), leva
  // direto para a ficha do novo cliente. Caso contrário (origem do
  // /cliente/*), preserva a página atual.
  const target = safeNext.startsWith("/admin/")
    ? `/admin/clientes/${parsed.data}`
    : safeNext;
  redirect(target);
}

/**
 * Limpa o cookie `focused_cliente_id` e volta para a listagem da agência.
 * Útil quando o admin quer explicitamente "sair do foco".
 */
export async function clearFocusedClienteAction(): Promise<void> {
  // Qualquer usuário logado pode limpar; a ausência de sessão já apaga
  // o cookie implicitamente no próximo sign-out.
  await requireUser();
  cookies().delete(FOCUSED_CLIENTE_COOKIE);
  redirect("/admin");
}

/**
 * Helper server-side para o layout `/admin`: dado o cookie atual,
 * resolve o nome do cliente em foco (ou null). Usado pelo chip
 * persistente no Topbar do admin.
 */
export async function getFocusedClienteResumo(): Promise<
  { id: string; nome_empresa: string } | null
> {
  const cid = getFocusedClienteIdFromCookies();
  if (!cid) return null;
  const session = await requireUser();
  const aid = session.profile.agencia_id;
  if (!aid) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("clientes")
    .select("id, nome_empresa")
    .eq("id", cid)
    .eq("agencia_id", aid)
    .maybeSingle();
  return data
    ? { id: (data as { id: string }).id, nome_empresa: (data as { nome_empresa: string }).nome_empresa }
    : null;
}
