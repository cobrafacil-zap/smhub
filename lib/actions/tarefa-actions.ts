"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAgenciaMember } from "@/lib/auth/session";
import type { TarefaPrioridade, TarefaStatus } from "@/types/database";

// ============================================================================
// SCHEMAS
// ============================================================================
const STATUS_VALUES: TarefaStatus[] = ["a_fazer", "em_andamento", "revisao", "concluido"];
const PRIORIDADE_VALUES: TarefaPrioridade[] = ["baixa", "media", "alta", "urgente"];

const tarefaSchema = z.object({
  titulo: z.string().min(2, "Título é obrigatório."),
  descricao: z.string().optional().nullable(),
  status: z.enum(STATUS_VALUES as [string, ...string[]]).default("a_fazer"),
  prioridade: z.enum(PRIORIDADE_VALUES as [string, ...string[]]).default("media"),
  prazo: z.string().optional().nullable(),
  cliente_id: z.string().uuid().optional().nullable(),
  responsaveis: z.array(z.string().uuid()).optional().default([]),
});

export type TarefaState = { error?: string; ok?: boolean } | undefined;

// ============================================================================
// CRIAR
// ============================================================================
export async function criarTarefaAction(
  _prev: TarefaState,
  formData: FormData
): Promise<TarefaState> {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const responsaveis = (formData.getAll("responsaveis") ?? [])
    .map((v) => String(v))
    .filter(Boolean);

  const parsed = tarefaSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") || null,
    status: formData.get("status") || "a_fazer",
    prioridade: formData.get("prioridade") || "media",
    prazo: formData.get("prazo") || null,
    cliente_id: formData.get("cliente_id") || null,
    responsaveis,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { data: tarefa, error } = await supabase
    .from("tarefas")
    .insert({
      agencia_id: aid,
      cliente_id: parsed.data.cliente_id ?? null,
      criado_por: session.profile.id,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao ?? null,
      status: parsed.data.status as TarefaStatus,
      prioridade: parsed.data.prioridade as TarefaPrioridade,
      prazo: parsed.data.prazo || null,
    })
    .select("id")
    .single();

  if (error || !tarefa) {
    return { error: `Erro ao criar tarefa: ${error.message}` };
  }

  // Multi-atribuição
  const resp = parsed.data.responsaveis ?? [];
  if (resp.length > 0) {
    const { error: respErr } = await supabase
      .from("tarefa_responsaveis")
      .insert(resp.map((usuario_id) => ({ tarefa_id: tarefa.id, usuario_id })));
    if (respErr) {
      // não aborta: a tarefa foi criada; só loga
      console.error("[criarTarefaAction] erro ao atribuir responsaveis:", respErr);
    }
  }

  revalidatePath("/admin/tarefas");
  revalidatePath("/admin");
  return { ok: true };
}

// ============================================================================
// ATUALIZAR (sincroniza responsaveis)
// ============================================================================
export async function atualizarTarefaAction(
  id: string,
  formData: FormData
): Promise<TarefaState> {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const responsaveis = (formData.getAll("responsaveis") ?? [])
    .map((v) => String(v))
    .filter(Boolean);

  const parsed = tarefaSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") || null,
    status: formData.get("status") || "a_fazer",
    prioridade: formData.get("prioridade") || "media",
    prazo: formData.get("prazo") || null,
    cliente_id: formData.get("cliente_id") || null,
    responsaveis,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase
    .from("tarefas")
    .update({
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao ?? null,
      status: parsed.data.status as TarefaStatus,
      prioridade: parsed.data.prioridade as TarefaPrioridade,
      prazo: parsed.data.prazo || null,
      cliente_id: parsed.data.cliente_id ?? null,
    })
    .eq("id", id)
    .eq("agencia_id", aid);
  if (error) return { error: "Erro ao atualizar tarefa." };

  // Sincroniza responsáveis: remove os antigos e reinsere o conjunto novo
  await supabase.from("tarefa_responsaveis").delete().eq("tarefa_id", id);
  if (responsaveis.length > 0) {
    const { error: respErr } = await supabase
      .from("tarefa_responsaveis")
      .insert(responsaveis.map((usuario_id) => ({ tarefa_id: id, usuario_id })));
    if (respErr) {
      console.error("[atualizarTarefaAction] erro ao atribuir responsaveis:", respErr);
    }
  }

  revalidatePath("/admin/tarefas");
  revalidatePath("/admin");
  return { ok: true };
}

// ============================================================================
// MOVER (mudar status = coluna do kanban)
// ============================================================================
export async function moverTarefaAction(id: string, status: string): Promise<TarefaState> {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  if (!STATUS_VALUES.includes(status as TarefaStatus)) {
    return { error: "Status inválido." };
  }

  const { error } = await supabase
    .from("tarefas")
    .update({ status: status as TarefaStatus })
    .eq("id", id)
    .eq("agencia_id", aid);
  if (error) return { error: "Erro ao mover tarefa." };

  revalidatePath("/admin/tarefas");
  revalidatePath("/admin");
  return { ok: true };
}

// ============================================================================
// ARQUIVAR
// ============================================================================
export async function arquivarTarefaAction(
  id: string,
  arquivado: boolean
): Promise<TarefaState> {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const { error } = await supabase
    .from("tarefas")
    .update({ arquivado })
    .eq("id", id)
    .eq("agencia_id", aid);
  if (error) return { error: "Erro ao arquivar tarefa." };

  revalidatePath("/admin/tarefas");
  revalidatePath("/admin");
  return { ok: true };
}

// ============================================================================
// EXCLUIR (só criador ou admin)
// ============================================================================
export async function deletarTarefaAction(id: string): Promise<TarefaState> {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const { data: tarefa } = await supabase
    .from("tarefas")
    .select("criado_por")
    .eq("id", id)
    .eq("agencia_id", aid)
    .maybeSingle();

  if (!tarefa) return { error: "Tarefa não encontrada." };

  const isCriador = tarefa.criado_por === session.profile.id;
  const isAdmin = session.profile.role === "admin_agencia";
  if (!isCriador && !isAdmin) {
    return { error: "Você só pode excluir tarefas que você criou." };
  }

  const { error } = await supabase.from("tarefas").delete().eq("id", id).eq("agencia_id", aid);
  if (error) return { error: "Erro ao excluir tarefa." };

  revalidatePath("/admin/tarefas");
  revalidatePath("/admin");
  return { ok: true };
}