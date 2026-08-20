"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAgenciaMember } from "@/lib/auth/session";
import type { TarefaPrioridade } from "@/types/database";

// ============================================================================
// SCHEMAS
// ============================================================================
// Slugs canônicos da coluna (mesmo conjunto do enum antigo). A migration 0040
// também aceita `custom-<uuid>` pra colunas extras, mas pra validação no
// form-data usamos o conjunto fechado — colunas custom são criadas pela
// action de coluna e já existem no banco antes de uma tarefa apontar pra elas.
const COLUNA_SLUGS = ["destinada", "em_andamento", "pronta", "entregue"] as const;
const PRIORIDADE_VALUES: TarefaPrioridade[] = ["baixa", "media", "alta", "urgente"];

const tarefaSchema = z.object({
  titulo: z.string().min(2, "Título é obrigatório."),
  descricao: z.string().optional().nullable(),
  tarefa_coluna_id: z.string().uuid("Coluna inválida."),
  prioridade: z.enum(PRIORIDADE_VALUES as [string, ...string[]]).default("media"),
  prazo: z.string().optional().nullable(),
  cliente_id: z.string().uuid().optional().nullable(),
  quadro_id: z.string().uuid().optional().nullable(),
  grupo_id: z.string().uuid().optional().nullable(),
  responsaveis: z.array(z.string().uuid()).optional().default([]),
});

export type TarefaState = { error?: string; ok?: boolean } | undefined;

// ============================================================================
// HELPERS
// ============================================================================
//
// Valida que o `quadro_id` enviado pertence à agência. Se não vier, usa o
// "Quadro geral" (mais antigo). Garante que toda tarefa tenha um quadro
// válido antes do insert/update (a coluna é NOT NULL no banco).
// ============================================================================
async function resolverQuadroId(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  quadroId: string | null | undefined
): Promise<string | null> {
  if (quadroId) {
    const { data } = await supabase
      .from("tarefa_quadros")
      .select("id")
      .eq("id", quadroId)
      .eq("agencia_id", aid)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  // Fallback: quadro geral (mais antigo).
  const { data: geral } = await supabase
    .from("tarefa_quadros")
    .select("id")
    .eq("agencia_id", aid)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return geral?.id ?? null;
}

/** Valida que `colunaId` pertence à agência E ao quadro passado. */
async function resolverColunaId(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  colunaId: string | null | undefined,
  quadroId: string
): Promise<string | null | false> {
  if (!colunaId) return null;
  const { data } = await supabase
    .from("tarefa_colunas")
    .select("id, agencia_id, quadro_id")
    .eq("id", colunaId)
    .maybeSingle();
  if (!data || data.agencia_id !== aid) return false;
  if (data.quadro_id !== quadroId) return false;
  return data.id;
}

// Valida que `grupoId` (se enviado) pertence à agência E ao quadro
// passado. Retorna o id se válido, null se o grupoId for null/empty,
// ou `false` se o grupo for inválido (não pertence à agência ou
// pertence a outro quadro).
async function resolverGrupoId(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  grupoId: string | null | undefined,
  quadroId: string
): Promise<string | null | false> {
  if (!grupoId) return null; // sem agrupamento
  const { data } = await supabase
    .from("tarefa_grupos")
    .select("id, agencia_id, quadro_id")
    .eq("id", grupoId)
    .maybeSingle();
  if (!data || data.agencia_id !== aid) return false; // não pertence à agência
  if (data.quadro_id !== quadroId) return false; // outro quadro
  return data.id;
}

// ============================================================================
// CRIAR
// ============================================================================
export async function criarTarefaAction(
  _prev: TarefaState,
  formData: FormData
): Promise<TarefaState> {
  const session = await requireAgenciaMember();
  // Só admin cria tarefas — membros da equipe apenas recebem (são atribuídos).
  if (session.profile.role !== "admin_agencia") {
    return { error: "Apenas administradores podem criar tarefas." };
  }
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const responsaveis = (formData.getAll("responsaveis") ?? [])
    .map((v) => String(v))
    .filter(Boolean);

  const parsed = tarefaSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") || null,
    tarefa_coluna_id: formData.get("tarefa_coluna_id") || null,
    prioridade: formData.get("prioridade") || "media",
    prazo: formData.get("prazo") || null,
    cliente_id: formData.get("cliente_id") || null,
    quadro_id: formData.get("quadro_id") || null,
    grupo_id: formData.get("grupo_id") || null,
    responsaveis,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const quadroId = await resolverQuadroId(supabase, aid, parsed.data.quadro_id);
  if (!quadroId) {
    return { error: "Nenhum quadro disponível. Recarregue a página." };
  }
  const colunaId = await resolverColunaId(
    supabase,
    aid,
    parsed.data.tarefa_coluna_id,
    quadroId
  );
  if (colunaId === false) {
    return { error: "Coluna inválida (não pertence ao quadro)." };
  }
  if (!colunaId) {
    return { error: "Selecione uma coluna para a tarefa." };
  }
  const grupoId = await resolverGrupoId(supabase, aid, parsed.data.grupo_id, quadroId);
  if (grupoId === false) {
    return { error: "Agrupamento inválido." };
  }

  const { data: tarefa, error } = await supabase
    .from("tarefas")
    .insert({
      agencia_id: aid,
      cliente_id: parsed.data.cliente_id ?? null,
      criado_por: session.profile.id,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao ?? null,
      tarefa_coluna_id: colunaId,
      prioridade: parsed.data.prioridade as TarefaPrioridade,
      prazo: parsed.data.prazo || null,
      quadro_id: quadroId,
      grupo_id: grupoId,
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
  // Só admin edita a tarefa (título, atribuição de responsáveis etc.).
  // Membros continuam podendo MOVER (mudar coluna) via moverTarefaAction.
  if (session.profile.role !== "admin_agencia") {
    return { error: "Apenas administradores podem editar tarefas." };
  }
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const responsaveis = (formData.getAll("responsaveis") ?? [])
    .map((v) => String(v))
    .filter(Boolean);

  const parsed = tarefaSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") || null,
    tarefa_coluna_id: formData.get("tarefa_coluna_id") || null,
    prioridade: formData.get("prioridade") || "media",
    prazo: formData.get("prazo") || null,
    cliente_id: formData.get("cliente_id") || null,
    quadro_id: formData.get("quadro_id") || null,
    grupo_id: formData.get("grupo_id") || null,
    responsaveis,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const quadroId = await resolverQuadroId(supabase, aid, parsed.data.quadro_id);
  if (!quadroId) {
    return { error: "Quadro inválido." };
  }
  const colunaId = await resolverColunaId(
    supabase,
    aid,
    parsed.data.tarefa_coluna_id,
    quadroId
  );
  if (colunaId === false) {
    return { error: "Coluna inválida (não pertence ao quadro)." };
  }
  if (!colunaId) {
    return { error: "Selecione uma coluna para a tarefa." };
  }
  const grupoId = await resolverGrupoId(supabase, aid, parsed.data.grupo_id, quadroId);
  if (grupoId === false) {
    return { error: "Agrupamento inválido." };
  }

  const { error } = await supabase
    .from("tarefas")
    .update({
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao ?? null,
      tarefa_coluna_id: colunaId,
      prioridade: parsed.data.prioridade as TarefaPrioridade,
      prazo: parsed.data.prazo || null,
      cliente_id: parsed.data.cliente_id ?? null,
      quadro_id: quadroId,
      grupo_id: grupoId,
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
// MOVER (mudar coluna do kanban)
//
// Recebe o `tarefa_coluna_id` (UUID) da coluna de destino. Valida que a
// coluna pertence à agência e ao quadro atual da tarefa — assim a action
// recusa mover entre quadros diferentes (o KanbanBoard passa a coluna do
// mesmo quadro selecionado).
// ============================================================================
export async function moverTarefaAction(
  id: string,
  colunaId: string
): Promise<TarefaState> {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  if (!/^[0-9a-f-]{36}$/i.test(colunaId)) {
    return { error: "Coluna inválida." };
  }

  // Busca a tarefa pra saber o quadro.
  const { data: tarefa } = await supabase
    .from("tarefas")
    .select("id, quadro_id")
    .eq("id", id)
    .eq("agencia_id", aid)
    .maybeSingle();
  if (!tarefa) return { error: "Tarefa não encontrada." };

  // Valida que a coluna alvo pertence ao quadro da tarefa.
  const valid = await resolverColunaId(supabase, aid, colunaId, tarefa.quadro_id);
  if (!valid) {
    return { error: "Coluna inválida (não pertence ao quadro da tarefa)." };
  }

  const { error } = await supabase
    .from("tarefas")
    .update({ tarefa_coluna_id: colunaId })
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
// ALTERAR PRAZO RÁPIDO (kanban)
// ============================================================================
export async function alterarPrazoTarefaAction(
  id: string,
  prazo: string | null
): Promise<TarefaState> {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  // Aceita YYYY-MM-DD ou null (sem prazo)
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) {
    return { error: "Data de prazo inválida." };
  }

  const { error } = await supabase
    .from("tarefas")
    .update({ prazo })
    .eq("id", id)
    .eq("agencia_id", aid);
  if (error) return { error: "Erro ao alterar prazo da tarefa." };

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
