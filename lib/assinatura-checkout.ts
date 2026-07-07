import { createPreference, type PlanoId } from "@/lib/mercadopago";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plano } from "@/types/database";

const PLANO_LABEL: Record<Plano, string> = {
  basico: "SM Hub Básico",
  pro: "SM Hub Pro",
  enterprise: "SM Hub Enterprise",
};

export type CriarPreferenceState =
  | { ok: true; initPoint: string }
  | { ok: false; error: string }
  | undefined;

/**
 * Lógica pura de criação de preference (sem "use server" no topo).
 * Pode ser chamada tanto da server action quanto da API route.
 */
export async function criarPreferenceInterno(input: {
  plano: Plano;
  dados?: { nome: string; email: string; telefone?: string | null; nomeAgencia: string };
}): Promise<CriarPreferenceState> {
  const session = await getSessionUser();

  // 1) Valida plano e busca valor
  const admin = createAdminClient();
  const { data: planoRow } = await admin
    .from("planos")
    .select("valor_mensal, nome")
    .eq("id", input.plano)
    .maybeSingle();
  if (!planoRow) return { ok: false, error: "Plano inválido." };
  const valor = Number(planoRow.valor_mensal);

  // 2) Monta external_ref + payerEmail
  let externalRef: string;
  let payerEmail: string;
  let payerName: string | undefined;
  let titulo: string;

  if (session && session.profile.role !== "cliente") {
    if (!session.profile.agencia_id)
      return { ok: false, error: "Usuário sem agência vinculada." };

    const { data: ag } = await admin
      .from("agencias")
      .select("id, status")
      .eq("id", session.profile.agencia_id)
      .maybeSingle();
    if (!ag) return { ok: false, error: "Agência não encontrada." };
    if (ag.status === "cancelada")
      return { ok: false, error: "Agência cancelada. Contate o suporte." };

    externalRef = `renovacao:${ag.id}:${input.plano}`;
    payerEmail = session.email ?? `agencia-${ag.id}@smhub.local`;
    payerName = session.profile.nome;
    titulo = `Renovação ${PLANO_LABEL[input.plano]} — SM Hub`;
  } else {
    if (!input.dados) return { ok: false, error: "Dados do cliente são obrigatórios." };

    // Verifica email já cadastrado
    const { data: existe } = await admin
      .from("usuarios")
      .select("id")
      .eq("email", input.dados.email)
      .maybeSingle();
    if (existe)
      return {
        ok: false,
        error: "E-mail já cadastrado. Faça login para renovar sua assinatura.",
      };

    externalRef = `novo:${input.dados.email}:${input.plano}`;
    payerEmail = input.dados.email;
    payerName = input.dados.nome;
    titulo = `Assinatura ${PLANO_LABEL[input.plano]} — SM Hub`;
  }

  try {
    const pref = await createPreference({
      plano: input.plano as PlanoId,
      valor,
      titulo,
      payerEmail,
      payerName,
      externalRef,
      metadata: {
        plano: input.plano,
        novo: !session,
        agency_hint: input.dados?.nomeAgencia ?? null,
      },
    });
    return { ok: true, initPoint: pref.initPoint };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar preferência de pagamento.";
    return { ok: false, error: msg };
  }
}
