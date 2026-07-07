"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: boolean } | undefined;

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });

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
      return { error: `Auth: ${error.message || error.code || "erro desconhecido"}` };
    }

    revalidatePath("/", "layout");
    if (next && next.startsWith("/")) redirect(next);
    redirect("/");
  } catch (err: unknown) {
    // redirect() joga um erro interno com digest NEXT_REDIRECT — não é um erro real.
    if (err instanceof Error && "digest" in err && typeof (err as { digest?: unknown }).digest === "string") {
      const digest = (err as { digest: string }).digest;
      if (digest.startsWith("NEXT_REDIRECT")) throw err;
    }
    const detail = err instanceof Error
      ? `${err.name}: ${err.message}`
      : String(err);
    console.error("[loginAction] exception:", err);
    return { error: `Debug: ${detail}` };
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
