"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAgenciaAdmin, requireAgenciaMember } from "@/lib/auth/session";

// ============================================================================
// SCHEMAS
// ============================================================================
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const nomeSchema = z
  .string()
  .trim()
  .min(1, "Nome é obrigatório.")
  .max(40, "Nome muito longo (máx. 40 caracteres).");

const criarSchema = z.object({
  nome: nomeSchema,
  cor: z.string().regex(HEX_COLOR, "Cor deve ser hex (#RRGGBB)."),
});

export type LabelState = { error?: string; ok?: boolean; id?: string } | undefined;

// ============================================================================
// HELPERS
// ============================================================================
async function labelExisteNaAgencia(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  labelId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("tarefa_labels")
    .select("id, agencia_id")
    .eq("id", labelId)
    .maybeSingle();
  return !!data && data.agencia_id === aid;
}

async function tarefaExisteNaAgencia(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  tarefaId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("tarefas")
    .select("id, agencia_id")
    .eq("id", tarefaId)
    .maybeSingle();
  return !!data && data.agencia_id === aid;
}

// ============================================================================
// CRIAR (admin)
// ============================================================================
export async function criarTarefaLabelAction(
  _prev: LabelState,
  formData: FormData
): Promise<LabelState> {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  const parsed = criarSchema.safeParse({
    nome: formData.get("nome"),
    cor: formData.get("cor"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Próxima ordem
  const { data: maxRow } = await supabase
    .from("tarefa_labels")
    .select("ordem")
    .eq("agencia_id", aid)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = (maxRow?.ordem ?? -1) + 1;

  const { data, error } = await supabase
    .from("tarefa_labels")
    .insert({
      agencia_id: aid,
      nome: parsed.data.nome,
      cor: parsed.data.cor,
      ordem,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") {
      return { error: "Já existe um label com esse nome nesta agência." };
    }
    return { error: `Erro ao criar label: ${error?.message ?? "desconhecido"}` };
  }
  revalidatePath("/admin/tarefas");
  return { ok: true, id: data.id };
}

// ============================================================================
// RENOMEAR / RECOLORIR (admin)
// ============================================================================
export async function renomearTarefaLabelAction(
  id: string,
  novoNome: string,
  novaCor?: string
): Promise<LabelState> {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  const parsedNome = nomeSchema.safeParse(novoNome);
  if (!parsedNome.success) {
    return { error: parsedNome.error.issues[0]?.message ?? "Nome inválido." };
  }
  if (novaCor !== undefined && !HEX_COLOR.test(novaCor)) {
    return { error: "Cor deve ser hex (#RRGGBB)." };
  }
  if (!(await labelExisteNaAgencia(supabase, aid, id))) {
    return { error: "Label não encontrado." };
  }

  const patch: { nome?: string; cor?: string } = { nome: parsedNome.data };
  if (novaCor !== undefined) patch.cor = novaCor;

  const { error } = await supabase.from("tarefa_labels").update(patch).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um label com esse nome nesta agência." };
    }
    return { error: "Erro ao atualizar label." };
  }
  revalidatePath("/admin/tarefas");
  return { ok: true, id };
}

// ============================================================================
// EXCLUIR (admin) — CASCADE deleta os vínculos com tarefas
// ============================================================================
export async function excluirTarefaLabelAction(id: string): Promise<LabelState> {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!(await labelExisteNaAgencia(supabase, aid, id))) {
    return { error: "Label não encontrado." };
  }
  const { error } = await supabase.from("tarefa_labels").delete().eq("id", id);
  if (error) return { error: "Erro ao excluir label." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id };
}

// ============================================================================
// APLICAR / REMOVER label de uma tarefa (admin/membro)
// ============================================================================
export async function aplicarLabelAction(
  tarefaId: string,
  labelId: string
): Promise<LabelState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!(await tarefaExisteNaAgencia(supabase, aid, tarefaId))) {
    return { error: "Tarefa não encontrada." };
  }
  if (!(await labelExisteNaAgencia(supabase, aid, labelId))) {
    return { error: "Label não encontrado." };
  }
  const { error } = await supabase
    .from("tarefa_label_vinculos")
    .insert({ tarefa_id: tarefaId, label_id: labelId });
  if (error && error.code !== "23505") {
    // 23505 = unique violation = já vinculado (idempotente)
    return { error: "Erro ao aplicar label." };
  }
  revalidatePath("/admin/tarefas");
  return { ok: true };
}

export async function removerLabelAction(
  tarefaId: string,
  labelId: string
): Promise<LabelState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!(await tarefaExisteNaAgencia(supabase, aid, tarefaId))) {
    return { error: "Tarefa não encontrada." };
  }
  const { error } = await supabase
    .from("tarefa_label_vinculos")
    .delete()
    .eq("tarefa_id", tarefaId)
    .eq("label_id", labelId);
  if (error) return { error: "Erro ao remover label." };
  revalidatePath("/admin/tarefas");
  return { ok: true };
}
