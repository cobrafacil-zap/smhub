"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAgenciaMember } from "@/lib/auth/session";

const uuidSchema = z.string().uuid();

export type MoverQuadroState = {
  error?: string;
  ok?: boolean;
} | undefined;

/**
 * Move uma tarefa para outro quadro (e opcionalmente outra coluna dentro
 * daquele quadro). Atualiza quadro_id, tarefa_coluna_id e zera grupo_id
 * (porque o grupo pode não existir no quadro destino).
 *
 * Permissão: qualquer membro da agência (mesma regra de moverTarefaAction).
 * O usuário pode estar vendo um card e querer realocá-lo entre projetos —
 * não é privilégio de admin.
 */
export async function moverTarefaQuadroAction(
  tarefaId: string,
  quadroDestinoId: string,
  colunaDestinoId?: string | null
): Promise<MoverQuadroState> {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (!uuidSchema.safeParse(tarefaId).success) {
    return { error: "Tarefa inválida." };
  }
  if (!uuidSchema.safeParse(quadroDestinoId).success) {
    return { error: "Quadro inválido." };
  }

  // Tarefa deve existir e pertencer à agência.
  const { data: tarefa } = await supabase
    .from("tarefas")
    .select("id, agencia_id, quadro_id")
    .eq("id", tarefaId)
    .eq("agencia_id", aid)
    .maybeSingle();
  if (!tarefa) return { error: "Tarefa não encontrada." };

  // Quadro destino deve existir e ser da mesma agência.
  const { data: quadroDest } = await supabase
    .from("tarefa_quadros")
    .select("id, agencia_id")
    .eq("id", quadroDestinoId)
    .maybeSingle();
  if (!quadroDest || quadroDest.agencia_id !== aid) {
    return { error: "Quadro destino inválido." };
  }

  // Se coluna não foi passada, pega a primeira coluna do quadro destino.
  // Se o quadro destino não tiver colunas, falha com mensagem clara.
  let colunaId: string | null = null;
  if (colunaDestinoId) {
    if (!uuidSchema.safeParse(colunaDestinoId).success) {
      return { error: "Coluna inválida." };
    }
    const { data: col } = await supabase
      .from("tarefa_colunas")
      .select("id, quadro_id")
      .eq("id", colunaDestinoId)
      .maybeSingle();
    if (!col || col.quadro_id !== quadroDestinoId) {
      return { error: "Coluna não pertence ao quadro destino." };
    }
    colunaId = col.id;
  } else {
    const { data: cols } = await supabase
      .from("tarefa_colunas")
      .select("id")
      .eq("quadro_id", quadroDestinoId)
      .eq("arquivada", false)
      .order("ordem", { ascending: true })
      .limit(1);
    if (!cols || cols.length === 0) {
      return {
        error:
          "Quadro destino não tem colunas. Crie uma coluna antes de mover tarefas pra ele.",
      };
    }
    colunaId = cols[0].id;
  }

  // Atualiza: novo quadro, nova coluna, zera grupo (pode não existir lá).
  // A `ordem` fica no fim (max+1024) — renumeração é responsabilidade da action
  // genérica `moverTarefaAction`. Aqui mantemos simples.
  const { data: maxRow } = await supabase
    .from("tarefas")
    .select("ordem")
    .eq("tarefa_coluna_id", colunaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const novaOrdem = (Number(maxRow?.ordem ?? 0) || 0) + 1024;

  const { error } = await supabase
    .from("tarefas")
    .update({
      quadro_id: quadroDestinoId,
      tarefa_coluna_id: colunaId,
      grupo_id: null,
      ordem: novaOrdem,
    })
    .eq("id", tarefaId)
    .eq("agencia_id", aid);
  if (error) return { error: "Erro ao mover tarefa para o quadro destino." };

  revalidatePath("/admin/tarefas");
  revalidatePath(`/admin/tarefas?quadro=${quadroDestinoId}`);
  revalidatePath(`/admin/tarefas?quadro=${tarefa.quadro_id}`);
  return { ok: true };
}
