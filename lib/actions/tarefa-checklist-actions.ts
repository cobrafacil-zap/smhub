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

const textoSchema = z
  .string()
  .trim()
  .min(1, "Texto é obrigatório.")
  .max(300, "Texto muito longo (máx. 300 caracteres).");

const uuidSchema = z.string().uuid();

export type ChecklistState = {
  error?: string;
  ok?: boolean;
  id?: string;
} | undefined;

// ============================================================================
// HELPERS
// ============================================================================

/** Valida que um checklist existe E pertence a uma tarefa da agência. */
async function checklistNaAgencia(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  checklistId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("tarefa_checklists")
    .select("id, tarefa_id, tarefa:tarefas!inner(agencia_id)")
    .eq("id", checklistId)
    .maybeSingle();
  if (!data) return false;
  const t = Array.isArray(data.tarefa) ? data.tarefa[0] : data.tarefa;
  return !!t && (t as { agencia_id: string }).agencia_id === aid;
}

/** Valida que um item existe E pertence a um checklist da agência. */
async function itemNaAgencia(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  itemId: string
): Promise<{ checklistId: string } | null> {
  const { data } = await supabase
    .from("tarefa_checklist_itens")
    .select("id, checklist_id, checklist:tarefa_checklists!inner(tarefa_id, tarefa:tarefas!inner(agencia_id))")
    .eq("id", itemId)
    .maybeSingle();
  if (!data) return null;
  const c = Array.isArray(data.checklist) ? data.checklist[0] : data.checklist;
  if (!c) return null;
  const t = Array.isArray((c as { tarefa: unknown }).tarefa)
    ? (c as { tarefa: unknown[] }).tarefa[0]
    : (c as { tarefa: unknown }).tarefa;
  if (!t || (t as { agencia_id: string }).agencia_id !== aid) return null;
  return { checklistId: data.checklist_id };
}

/** Valida tarefa na agência. */
async function tarefaNaAgencia(
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
// CHECKLISTS
// ============================================================================
export async function criarChecklistAction(
  tarefaId: string,
  nome: string
): Promise<ChecklistState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(tarefaId).success) {
    return { error: "Tarefa inválida." };
  }
  if (!(await tarefaNaAgencia(supabase, aid, tarefaId))) {
    return { error: "Tarefa não encontrada." };
  }
  const parsed = nomeSchema.safeParse(nome);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  // Próxima ordem
  const { data: maxRow } = await supabase
    .from("tarefa_checklists")
    .select("ordem")
    .eq("tarefa_id", tarefaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = (maxRow?.ordem ?? -1) + 1;

  const { data, error } = await supabase
    .from("tarefa_checklists")
    .insert({ tarefa_id: tarefaId, nome: parsed.data, ordem })
    .select("id")
    .single();
  if (error || !data) return { error: "Erro ao criar checklist." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id: data.id };
}

export async function renomearChecklistAction(
  id: string,
  novoNome: string
): Promise<ChecklistState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(id).success) return { error: "Checklist inválido." };
  if (!(await checklistNaAgencia(supabase, aid, id))) {
    return { error: "Checklist não encontrado." };
  }
  const parsed = nomeSchema.safeParse(novoNome);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }
  const { error } = await supabase
    .from("tarefa_checklists")
    .update({ nome: parsed.data })
    .eq("id", id);
  if (error) return { error: "Erro ao renomear checklist." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id };
}

export async function excluirChecklistAction(id: string): Promise<ChecklistState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(id).success) return { error: "Checklist inválido." };
  if (!(await checklistNaAgencia(supabase, aid, id))) {
    return { error: "Checklist não encontrado." };
  }
  const { error } = await supabase.from("tarefa_checklists").delete().eq("id", id);
  if (error) return { error: "Erro ao excluir checklist." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id };
}

// ============================================================================
// ITENS
// ============================================================================
export async function criarChecklistItemAction(
  checklistId: string,
  texto: string
): Promise<ChecklistState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(checklistId).success) {
    return { error: "Checklist inválido." };
  }
  if (!(await checklistNaAgencia(supabase, aid, checklistId))) {
    return { error: "Checklist não encontrado." };
  }
  const parsed = textoSchema.safeParse(texto);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Texto inválido." };
  }

  // Próxima ordem
  const { data: maxRow } = await supabase
    .from("tarefa_checklist_itens")
    .select("ordem")
    .eq("checklist_id", checklistId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = (maxRow?.ordem ?? 0) + 1024;

  const { data, error } = await supabase
    .from("tarefa_checklist_itens")
    .insert({
      checklist_id: checklistId,
      texto: parsed.data,
      ordem,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Erro ao criar item." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id: data.id };
}

export async function editarChecklistItemAction(
  itemId: string,
  novoTexto: string
): Promise<ChecklistState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(itemId).success) return { error: "Item inválido." };
  if (!(await itemNaAgencia(supabase, aid, itemId))) {
    return { error: "Item não encontrado." };
  }
  const parsed = textoSchema.safeParse(novoTexto);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Texto inválido." };
  }
  const { error } = await supabase
    .from("tarefa_checklist_itens")
    .update({ texto: parsed.data })
    .eq("id", itemId);
  if (error) return { error: "Erro ao editar item." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id: itemId };
}

export async function toggleChecklistItemAction(
  itemId: string,
  concluido: boolean
): Promise<ChecklistState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(itemId).success) return { error: "Item inválido." };
  if (!(await itemNaAgencia(supabase, aid, itemId))) {
    return { error: "Item não encontrado." };
  }
  const { error } = await supabase
    .from("tarefa_checklist_itens")
    .update({ concluido })
    .eq("id", itemId);
  if (error) return { error: "Erro ao atualizar item." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id: itemId };
}

export async function excluirChecklistItemAction(
  itemId: string
): Promise<ChecklistState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(itemId).success) return { error: "Item inválido." };
  if (!(await itemNaAgencia(supabase, aid, itemId))) {
    return { error: "Item não encontrado." };
  }
  const { error } = await supabase
    .from("tarefa_checklist_itens")
    .delete()
    .eq("id", itemId);
  if (error) return { error: "Erro ao excluir item." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id: itemId };
}

// ============================================================================
// MOVER ITEM (drag dos itens dentro do checklist)
//
// mesma lógica fracionária das tarefas: nova_ordem = (ordem_antes ?? max+1024)/2.
// se colidir (|delta| < 1e-9), renumera a coluna (aqui, o checklist).
// ============================================================================
const COLISAO_EPS = 1e-9;

export async function moverChecklistItemAction(
  itemId: string,
  antesDeItemId: string | null
): Promise<ChecklistState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(itemId).success) return { error: "Item inválido." };
  const ctx = await itemNaAgencia(supabase, aid, itemId);
  if (!ctx) return { error: "Item não encontrado." };
  const { checklistId } = ctx;

  // Pega o item atual
  const { data: atual } = await supabase
    .from("tarefa_checklist_itens")
    .select("id, ordem")
    .eq("id", itemId)
    .maybeSingle();
  if (!atual) return { error: "Item não encontrado." };
  const ordemAtual = Number(atual.ordem);

  // Resolve o "antes": null = fim do checklist
  let ordemVizinho: number | null = null;
  if (antesDeItemId && antesDeItemId !== itemId) {
    if (!uuidSchema.safeParse(antesDeItemId).success) {
      return { error: "Item de referência inválido." };
    }
    const { data: viz } = await supabase
      .from("tarefa_checklist_itens")
      .select("id, ordem")
      .eq("id", antesDeItemId)
      .eq("checklist_id", checklistId)
      .maybeSingle();
    if (!viz) return { error: "Item de referência não encontrado." };
    ordemVizinho = Number(viz.ordem);
  }

  // Calcula a nova ordem:
  //   - sem vizinho: vai pro fim (max + 1024)
  //   - com vizinho: ordena antes do vizinho (max_anterior/2, ou max/2
  //     se for o primeiro)
  let novaOrdem: number;
  if (ordemVizinho === null) {
    const { data: maxRow } = await supabase
      .from("tarefa_checklist_itens")
      .select("ordem")
      .eq("checklist_id", checklistId)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    novaOrdem = (Number(maxRow?.ordem ?? 0) || 0) + 1024;
  } else {
    // Pega o item imediatamente ANTES do vizinho (na ordem atual)
    const { data: anterior } = await supabase
      .from("tarefa_checklist_itens")
      .select("id, ordem")
      .eq("checklist_id", checklistId)
      .lt("ordem", ordemVizinho)
      .neq("id", itemId)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!anterior) {
      novaOrdem = ordemVizinho - 512;
    } else {
      novaOrdem = (Number(anterior.ordem) + ordemVizinho) / 2;
    }
  }

  // Detecção de colisão de precisão: se novaOrdem ficou igual à de algum
  // vizinho (|delta| < 1e-9), renumera o checklist inteiro e refaz.
  const { data: vizinhos } = await supabase
    .from("tarefa_checklist_itens")
    .select("id, ordem")
    .eq("checklist_id", checklistId)
    .neq("id", itemId);

  const colide = (vizinhos ?? []).some(
    (v) => Math.abs(Number(v.ordem) - novaOrdem) < COLISAO_EPS
  );

  if (colide) {
    // Renumera o checklist via SQL direto (mesmo padrão do RPC de tarefas).
    // Aqui abrimos mão de chamar o RPC porque não criamos um específico
    // pra checklist (o overhead de uma migration a mais não vale).
    const { data: todos } = await supabase
      .from("tarefa_checklist_itens")
      .select("id, ordem")
      .eq("checklist_id", checklistId)
      .order("ordem", { ascending: true });
    if (todos && todos.length > 0) {
      let i = 1;
      for (const item of todos) {
        const target = i * 1024;
        if (item.id !== itemId) {
          await supabase
            .from("tarefa_checklist_itens")
            .update({ ordem: target })
            .eq("id", item.id);
        }
        i += 1;
      }
      // Recalcula novaOrdem com base nas posições finais
      const idxMovido = todos.findIndex((t) => t.id === itemId);
      // Remove o item da sequência original e reinsere na posição alvo
      const restantes = todos.filter((t) => t.id !== itemId);
      const posFinal = antesDeItemId
        ? restantes.findIndex((t) => t.id === antesDeItemId)
        : restantes.length;
      const insertIdx = posFinal === -1 ? restantes.length : posFinal;
      // Recalcula: a posição insertIdx recebe step 1024
      const ordemAnteriorFinal =
        insertIdx === 0 ? 0 : Number(restantes[insertIdx - 1].ordem);
      const ordemPosteriorFinal =
        insertIdx >= restantes.length
          ? Number(restantes[restantes.length - 1].ordem) + 1024
          : Number(restantes[insertIdx].ordem);
      novaOrdem =
        ordemAnteriorFinal === 0
          ? ordemPosteriorFinal - 512
          : (ordemAnteriorFinal + ordemPosteriorFinal) / 2;
      // idxMovido não é mais usado
      void idxMovido;
    }
  }

  if (novaOrdem === ordemAtual) {
    return { ok: true, id: itemId };
  }

  const { error } = await supabase
    .from("tarefa_checklist_itens")
    .update({ ordem: novaOrdem })
    .eq("id", itemId);
  if (error) return { error: "Erro ao mover item." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id: itemId };
}
