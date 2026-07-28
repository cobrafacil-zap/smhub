"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCliente } from "@/lib/auth/session";
import type { CredencialCliente } from "@/lib/actions/cliente-convite-actions";
import type { EmpresaReferencia } from "@/types/database";

export type ContaState = { error?: string; ok?: boolean } | undefined;

// ============================================================================
// FOTO DE PERFIL — a cliente faz upload dela mesma em /cliente/conta.
// ============================================================================
export async function atualizarMinhaFotoPerfilAction(
  _prev: ContaState,
  formData: FormData
): Promise<ContaState> {
  const session = await requireCliente();
  const foto = String(formData.get("foto_perfil") ?? "").trim() || null;
  const supabase = createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ foto_perfil: foto })
    .eq("id", session.profile.cliente_id!);
  if (error) return { error: "Erro ao salvar a foto." };
  revalidatePath("/cliente/conta");
  revalidatePath("/cliente");
  return { ok: true };
}

// ============================================================================
// PREFERÊNCIAS — toggle "receber sugestões de datas comemorativas".
// ============================================================================
export async function atualizarMinhasPreferenciasAction(
  recebe: boolean
): Promise<ContaState> {
  const session = await requireCliente();
  const supabase = createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ recebe_datas_comemorativas: recebe })
    .eq("id", session.profile.cliente_id!);
  if (error) return { error: "Erro ao salvar a preferência." };
  revalidatePath("/cliente/conta");
  revalidatePath("/cliente/planejamento");
  return { ok: true };
}

// ============================================================================
// INFORMAÇÕES SOBRE MINHA EMPRESA — credenciais (login/senha) + referências.
// Grava no campo existente `credenciais` (cofre compartilhado com a agência) e
// no novo `empresas_referencia`. RLS clientes_update_self autoriza o update.
// ============================================================================
const empresaSchema = z.object({
  credenciais: z.array(
    z.object({
      label: z.string(),
      url: z.string().optional(),
      usuario: z.string().optional(),
      senha: z.string().optional(),
      observacao: z.string().optional(),
    })
  ),
  empresas_referencia: z.array(
    z.object({
      nome: z.string(),
      url: z.string().optional(),
      motivo: z.string().optional(),
    })
  ),
});

export async function atualizarMinhaEmpresaAction(
  _prev: ContaState,
  formData: FormData
): Promise<ContaState> {
  const session = await requireCliente();
  const credRaw = String(formData.get("credenciais") ?? "[]");
  const refRaw = String(formData.get("empresas_referencia") ?? "[]");

  let cred: unknown, refs: unknown;
  try {
    cred = JSON.parse(credRaw);
    refs = JSON.parse(refRaw);
  } catch {
    return { error: "Dados inválidos." };
  }

  const parsed = empresaSchema.safeParse({ credenciais: cred, empresas_referencia: refs });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Sanitiza credenciais: label não-vazio.
  const credenciais: CredencialCliente[] = parsed.data.credenciais.filter(
    (c) => c && typeof c.label === "string" && c.label.trim().length > 0
  );
  // Sanitiza referências: nome não-vazio.
  const empresas_referencia: EmpresaReferencia[] = parsed.data.empresas_referencia.filter(
    (r) => r && typeof r.nome === "string" && r.nome.trim().length > 0
  );

  const supabase = createClient();
  const { error } = await supabase
    .from("clientes")
    .update({
      credenciais: credenciais as unknown as Record<string, unknown>[],
      empresas_referencia: empresas_referencia as unknown as Record<string, unknown>[],
    })
    .eq("id", session.profile.cliente_id!);
  if (error) return { error: "Erro ao salvar as informações da empresa." };
  revalidatePath("/cliente/conta");
  revalidatePath(`/admin/clientes`);
  return { ok: true };
}

// ============================================================================
// ACEITAR DATA COMEMORATIVA — cria uma entrada (post) no planejamento da
// cliente a partir de uma data comemorativa. Ownership: o planejamento tem que
// pertencer à cliente. Service-role + check explícito (não há RLS de INSERT
// em planejamento_entradas para clientes).
// ============================================================================
export async function clienteAceitarDataComemorativaAction(
  planejamentoId: string,
  data: string,
  nome: string
): Promise<ContaState> {
  const session = await requireCliente();
  if (!session.profile.cliente_id) return { error: "Cliente não definido." };
  if (!planejamentoId || !data || !nome) return { error: "Dados inválidos." };

  const admin = createAdminClient();
  // Confirma que o planejamento pertence a esta cliente.
  const { data: plan } = await admin
    .from("planejamentos")
    .select("id, cliente_id")
    .eq("id", planejamentoId)
    .maybeSingle();
  if (!plan || (plan as { cliente_id: string }).cliente_id !== session.profile.cliente_id) {
    return { error: "Planejamento não encontrado." };
  }

  const { error } = await admin.from("planejamento_entradas").insert({
    planejamento_id: planejamentoId,
    data,
    tipo: "post_feed",
    titulo: nome,
    status: "pendente",
    cor: null,
  });
  if (error) return { error: "Erro ao adicionar a data ao planejamento." };

  revalidatePath("/cliente/planejamento");
  return { ok: true };
}