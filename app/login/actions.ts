"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

export type ActionState = { error?: string; ok?: boolean } | undefined;

/**
 * Descobre o painel certo para o usuário recém-logado, pela role.
 * Replica a lógica do middleware (super_admins → /super-admin,
 * admin_agencia/membro_equipe → /admin, demais → /cliente).
 */
async function painelPorRole(userId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: superAdm } = await admin
    .from("super_admins")
    .select("id, ativo")
    .eq("user_id", userId)
    .maybeSingle();

  let role: UserRole | null = null;
  if (superAdm) {
    role = "super_admin";
  } else {
    const { data: usuario } = await admin
      .from("usuarios")
      .select("role, ativo")
      .eq("user_id", userId)
      .maybeSingle();
    if (usuario) role = usuario.role as UserRole;
  }

  if (role === "super_admin") return "/super-admin";
  if (role === "admin_agencia" || role === "membro_equipe") return "/admin";
  return "/cliente";
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("[loginAction] supabase auth error:", error);
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("invalid login credentials") || msg.includes("invalid")) {
        return { error: "E-mail ou senha inválidos." };
      }
      if (msg.includes("email not confirmed")) {
        return { error: "Confirme seu e-mail antes de entrar." };
      }
      if (msg.includes("rate limit")) {
        return { error: "Muitas tentativas. Aguarde alguns instantes." };
      }
      return { error: "Não foi possível entrar agora. Tente novamente em instantes." };
    }

    revalidatePath("/", "layout");
    // Deep-link explícito (ex.: volta de OAuth Meta) mantém o destino.
    if (next && next.startsWith("/")) redirect(next);
    // Sem `next`: vai direto ao painel conforme a role do usuário.
    redirect(await painelPorRole(data.user.id));
  } catch (err: unknown) {
    // redirect() joga um erro interno com digest NEXT_REDIRECT — não é um erro real.
    if (err instanceof Error && "digest" in err && typeof (err as { digest?: unknown }).digest === "string") {
      const digest = (err as { digest: string }).digest;
      if (digest.startsWith("NEXT_REDIRECT")) throw err;
    }
    const detail = err instanceof Error
      ? `${err.name}: ${err.message}`
      : String(err);
    console.error("[loginAction] exception:", detail);
    return { error: "Não foi possível concluir o login. Tente novamente." };
  }
}

export async function signOutAction() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[signOutAction] erro:", err);
  }
  // Após logout, volta pra LP de vendas (não pra /login).
  redirect("/");
}
