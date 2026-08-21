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
  label_ids: z.array(z.string().uuid()).optional().default([]),
});

export type TarefaState = { error?: string; ok?: boolean } | undefined;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Sincroniza os vínculos tarefa <-> label: remove os antigos, insere os novos.
 * Idempotente. Não loga warnings pra erros triviais (FK duplicada, etc).
 */
async function sincronizarLabelsAction(
  supabase: ReturnType<typeof createClient>,
  tarefaId: string,
  labelIds: string[]
): Promise<void> {
  // Remove todos os vínculos atuais
  await supabase.from("tarefa_label_vinculos").delete().eq("tarefa_id", tarefaId);
  // Insere os novos (se houver)
  if (labelIds.length === 0) return;
  const { error } = await supabase
    .from("tarefa_label_vinculos")
    .insert(labelIds.map((label_id) => ({ tarefa_id: tarefaId, label_id })));
  if (error) {
    console.error("[sincronizarLabelsAction] erro ao inserir vinculos:", error);
  }
}
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

  // Labels (vincula todos de uma vez)
  const labelIds = parsed.data.label_ids ?? [];
  if (labelIds.length > 0) {
    await sincronizarLabelsAction(supabase, tarefa.id, labelIds);
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

  // Sincroniza labels
  await sincronizarLabelsAction(supabase, id, parsed.data.label_ids ?? []);

  revalidatePath("/admin/tarefas");
  revalidatePath("/admin");
  return { ok: true };
}

// ============================================================================
// MOVER (mudar coluna E/OU posição dentro do kanban)
//
// Recebe:
//   - id: UUID da tarefa.
//   - colunaId: UUID da coluna de destino.
//   - antesDeTarefaId: se informado, a tarefa vai ANTES dessa tarefa
//     (dentro da mesma coluna). Se null/undefined, vai pro fim.
//
// Valida coluna do mesmo quadro. NÃO move entre quadros — pra isso use
// `moverTarefaQuadroAction`.
//
// Algoritmo de ordem fracionário (estilo Trello):
//   - Sem `antesDeTarefaId`: nova_ordem = max(coluna) + 1024.
//   - Com `antesDeTarefaId`: nova_ordem = (ordem_anterior + ordem_vizinho) / 2,
//     onde "anterior" é a tarefa imediatamente antes do vizinho (na ordem
//     atual). Se for o primeiro, nova_ordem = ordem_vizinho - 512.
//   - Se colidir (< 1e-9 de distância), chama o RPC `renumerar_ordem_tarefas_coluna`
//     pra dar espaço e refaz o cálculo.
// ============================================================================
const COLISAO_EPS = 1e-9;

export async function moverTarefaAction(
  id: string,
  colunaId: string,
  antesDeTarefaId: string | null = null
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
    .select("id, quadro_id, tarefa_coluna_id, ordem")
    .eq("id", id)
    .eq("agencia_id", aid)
    .maybeSingle();
  if (!tarefa) return { error: "Tarefa não encontrada." };

  // Valida que a coluna alvo pertence ao quadro da tarefa.
  const valid = await resolverColunaId(supabase, aid, colunaId, tarefa.quadro_id);
  if (!valid) {
    return { error: "Coluna inválida (não pertence ao quadro da tarefa)." };
  }

  // Calcula a nova posição dentro da coluna alvo.
  // 1) Sem `antesDeTarefaId` → fim.
  // 2) Com `antesDeTarefaId`:
  //    - Vai pro fim se for null/undefined.
  //    - Vai antes do vizinho (ou pro fim se vizinho não existir).
  let novaOrdem: number;
  let precisaAtualizarColuna = tarefa.tarefa_coluna_id !== colunaId;

  if (!antesDeTarefaId || antesDeTarefaId === id) {
    // Sem vizinho: vai pro fim
    const { data: maxRow } = await supabase
      .from("tarefas")
      .select("ordem")
      .eq("tarefa_coluna_id", colunaId)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    novaOrdem = (Number(maxRow?.ordem ?? 0) || 0) + 1024;
  } else {
    if (!/^[0-9a-f-]{36}$/i.test(antesDeTarefaId)) {
      return { error: "Tarefa de referência inválida." };
    }
    const { data: viz } = await supabase
      .from("tarefas")
      .select("id, ordem")
      .eq("id", antesDeTarefaId)
      .eq("tarefa_coluna_id", colunaId)
      .maybeSingle();
    if (!viz) {
      // Vizinho não está na coluna destino (talvez em outra coluna):
      // vai pro fim.
      const { data: maxRow } = await supabase
        .from("tarefas")
        .select("ordem")
        .eq("tarefa_coluna_id", colunaId)
        .order("ordem", { ascending: false })
        .limit(1)
        .maybeSingle();
      novaOrdem = (Number(maxRow?.ordem ?? 0) || 0) + 1024;
    } else {
      // Pega a tarefa imediatamente antes do vizinho (excluindo a própria)
      const { data: anterior } = await supabase
        .from("tarefas")
        .select("id, ordem")
        .eq("tarefa_coluna_id", colunaId)
        .lt("ordem", viz.ordem)
        .neq("id", id)
        .order("ordem", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!anterior) {
        novaOrdem = Number(viz.ordem) - 512;
      } else {
        novaOrdem = (Number(anterior.ordem) + Number(viz.ordem)) / 2;
      }
    }
  }

  // Detecta colisão de precisão: se novaOrdem coincide com algum vizinho,
  // chama o RPC de renumeração e refaz o cálculo.
  if (novaOrdem !== undefined) {
    const { data: vizinhos } = await supabase
      .from("tarefas")
      .select("id, ordem")
      .eq("tarefa_coluna_id", colunaId)
      .neq("id", id);
    const colide = (vizinhos ?? []).some(
      (v) => Math.abs(Number(v.ordem) - novaOrdem) < COLISAO_EPS
    );
    if (colide) {
      // Renumera via RPC
      const { error: rpcErr } = await supabase.rpc("renumerar_ordem_tarefas_coluna", {
        coluna_id: colunaId,
      });
      if (rpcErr) {
        console.error("[moverTarefaAction] rpc renumerar error:", rpcErr);
      }
      // Recalcula novaOrdem na nova escala
      if (!antesDeTarefaId || antesDeTarefaId === id) {
        const { data: maxRow } = await supabase
          .from("tarefas")
          .select("ordem")
          .eq("tarefa_coluna_id", colunaId)
          .order("ordem", { ascending: false })
          .limit(1)
          .maybeSingle();
        novaOrdem = (Number(maxRow?.ordem ?? 0) || 0) + 1024;
      } else {
        const { data: viz } = await supabase
          .from("tarefas")
          .select("id, ordem")
          .eq("id", antesDeTarefaId)
          .eq("tarefa_coluna_id", colunaId)
          .maybeSingle();
        if (viz) {
          const { data: anterior } = await supabase
            .from("tarefas")
            .select("id, ordem")
            .eq("tarefa_coluna_id", colunaId)
            .lt("ordem", viz.ordem)
            .neq("id", id)
            .order("ordem", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!anterior) novaOrdem = Number(viz.ordem) - 512;
          else novaOrdem = (Number(anterior.ordem) + Number(viz.ordem)) / 2;
        } else {
          // fallback
          novaOrdem = (Number(tarefa.ordem) || 0) + 1024;
        }
      }
    }
  }

  const patch: Record<string, unknown> = { ordem: novaOrdem };
  if (precisaAtualizarColuna) {
    patch.tarefa_coluna_id = colunaId;
  }

  const { error } = await supabase
    .from("tarefas")
    .update(patch)
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

// ============================================================================
// CRIAR RÁPIDO (inline no footer da coluna — sem modal)
//
// Versão enxuta do criar: só titulo + coluna. Resto fica em defaults
// (prioridade media, sem prazo, sem cliente, sem responsável, sem label).
// Mesmo role check do criarTarefaAction (só admin).
// ============================================================================
const rapidoSchema = z.object({
  titulo: z.string().trim().min(2, "Título é obrigatório."),
  colunaId: z.string().uuid("Coluna inválida."),
});

export async function criarTarefaRapidoAction(input: {
  titulo: string;
  colunaId: string;
}): Promise<TarefaState & { id?: string }> {
  const session = await requireAgenciaMember();
  if (session.profile.role !== "admin_agencia") {
    return { error: "Apenas administradores podem criar tarefas." };
  }
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  const parsed = rapidoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Pega o quadro da coluna
  const { data: col } = await supabase
    .from("tarefa_colunas")
    .select("id, quadro_id")
    .eq("id", parsed.data.colunaId)
    .maybeSingle();
  if (!col) return { error: "Coluna não encontrada." };

  // Próxima ordem no fim da coluna
  const { data: maxRow } = await supabase
    .from("tarefas")
    .select("ordem")
    .eq("tarefa_coluna_id", parsed.data.colunaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = (Number(maxRow?.ordem ?? 0) || 0) + 1024;

  const { data: tarefa, error } = await supabase
    .from("tarefas")
    .insert({
      agencia_id: aid,
      criado_por: session.profile.id,
      titulo: parsed.data.titulo,
      tarefa_coluna_id: parsed.data.colunaId,
      quadro_id: col.quadro_id,
      prioridade: "media",
      ordem,
    })
    .select("id")
    .single();
  if (error || !tarefa) {
    return { error: `Erro ao criar tarefa: ${error?.message ?? "desconhecido"}` };
  }
  revalidatePath("/admin/tarefas");
  revalidatePath("/admin");
  return { ok: true, id: tarefa.id };
}
