"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAgenciaMember } from "@/lib/auth/session";

// ============================================================================
// SCHEMAS
// ============================================================================
const nomeSchema = z
  .string()
  .trim()
  .min(1, "Nome é obrigatório.")
  .max(80, "Nome muito longo (máx. 80 caracteres).");

export type QuadroState = { error?: string; ok?: boolean; id?: string } | undefined;

// ============================================================================
// HELPER
// ============================================================================
async function buscarQuadroGeral(
  supabase: ReturnType<typeof createClient>,
  aid: string
): Promise<string | null> {
  const { data } = await supabase
    .from("tarefa_quadros")
    .select("id")
    .eq("agencia_id", aid)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// ============================================================================
// CRIAR
// ============================================================================
export async function criarQuadroAction(
  _prev: QuadroState,
  formData: FormData
): Promise<QuadroState> {
  const session = await requireAgenciaMember();
  // Só admins criam quadros (membros veem, mas não gerenciam).
  if (session.profile.role !== "admin_agencia") {
    return { error: "Apenas administradores podem criar quadros." };
  }
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  const parsed = nomeSchema.safeParse(formData.get("nome"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  // ordem = max(ordem) + 1
  const { data: maxRow } = await supabase
    .from("tarefa_quadros")
    .select("ordem")
    .eq("agencia_id", aid)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const proximaOrdem = (maxRow?.ordem ?? -1) + 1;

  const { data, error } = await supabase
    .from("tarefa_quadros")
    .insert({
      agencia_id: aid,
      nome: parsed.data,
      ordem: proximaOrdem,
      created_by: session.profile.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: `Erro ao criar quadro: ${error?.message ?? "desconhecido"}` };
  }

  revalidatePath("/admin/tarefas");
  return { ok: true, id: data.id };
}

// ============================================================================
// RENOMEAR
// ============================================================================
export async function renomearQuadroAction(
  id: string,
  novoNome: string
): Promise<QuadroState> {
  const session = await requireAgenciaMember();
  if (session.profile.role !== "admin_agencia") {
    return { error: "Apenas administradores podem renomear quadros." };
  }
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  const parsed = nomeSchema.safeParse(novoNome);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  const { error } = await supabase
    .from("tarefa_quadros")
    .update({ nome: parsed.data })
    .eq("id", id)
    .eq("agencia_id", aid);
  if (error) return { error: "Erro ao renomear quadro." };

  revalidatePath("/admin/tarefas");
  return { ok: true };
}

// ============================================================================
// EXCLUIR
// ============================================================================
//
// Tarefas do quadro excluído vão pro "Quadro geral" (mais antigo da agência),
// nunca são apagadas. Não é permitido excluir o próprio "Quadro geral".
// ============================================================================
export async function excluirQuadroAction(id: string): Promise<QuadroState> {
  const session = await requireAgenciaMember();
  if (session.profile.role !== "admin_agencia") {
    return { error: "Apenas administradores podem excluir quadros." };
  }
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  const geralId = await buscarQuadroGeral(supabase, aid);
  if (!geralId) {
    return { error: "Quadro geral não encontrado — não é seguro excluir." };
  }
  if (id === geralId) {
    return { error: "Não é possível excluir o Quadro geral." };
  }

  // Move tarefas do quadro excluído pro Quadro geral.
  const { error: moveErr } = await supabase
    .from("tarefas")
    .update({ quadro_id: geralId })
    .eq("quadro_id", id)
    .eq("agencia_id", aid);
  if (moveErr) {
    return { error: `Erro ao mover tarefas: ${moveErr.message}` };
  }

  // Exclui o quadro.
  const { error: delErr } = await supabase
    .from("tarefa_quadros")
    .delete()
    .eq("id", id)
    .eq("agencia_id", aid);
  if (delErr) {
    return { error: `Erro ao excluir quadro: ${delErr.message}` };
  }

  revalidatePath("/admin/tarefas");
  return { ok: true };
}
