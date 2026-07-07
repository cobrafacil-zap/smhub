"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  token: z.string().min(20),
  nome: z.string().min(2, "Nome muito curto."),
  nomeAgencia: z.string().min(2, "Nome da agência muito curto."),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres."),
});

export type AtivarContaState = { error?: string; ok?: boolean } | undefined;

export async function ativarContaAction(input: {
  token: string;
  nome: string;
  nomeAgencia: string;
  senha: string;
}): Promise<AtivarContaState> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();

  // 1) Buscar token
  const { data: signup } = await admin
    .from("signup_tokens")
    .select("id, expira_em, usado_em, user_id, agencia_id, email, plano")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!signup) return { error: "Link inválido ou expirado." };
  if (signup.usado_em) return { error: "Este link já foi utilizado." };
  if (new Date(signup.expira_em) < new Date())
    return { error: "Este link expirou. Entre em contato com o suporte." };
  if (!signup.user_id || !signup.agencia_id) return { error: "Token inválido." };

  // 2) Atualizar senha do user
  const { error: pwErr } = await admin.auth.admin.updateUserById(signup.user_id, {
    password: parsed.data.senha,
  });
  if (pwErr) return { error: `Erro ao definir senha: ${pwErr.message}` };

  // 3) Atualizar nome do usuario e nome da agência
  await admin
    .from("usuarios")
    .update({ nome: parsed.data.nome })
    .eq("user_id", signup.user_id);
  await admin
    .from("agencias")
    .update({ nome_fantasia: parsed.data.nomeAgencia })
    .eq("id", signup.agencia_id);

  // 4) Marcar signup_token como usado
  await admin
    .from("signup_tokens")
    .update({ usado_em: new Date().toISOString() })
    .eq("id", signup.id);

  return { ok: true };
}
