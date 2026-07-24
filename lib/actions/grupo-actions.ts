"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAgenciaAdmin, requireAgenciaMember } from "@/lib/auth/session";

// ============================================================================
// SCHEMAS
// ============================================================================
const nomeSchema = z
  .string()
  .trim()
  .min(1, "Nome é obrigatório.")
  .max(80, "Nome muito longo (máx. 80 caracteres).");

const grupoSchema = z.object({
  quadro_id: z.string().uuid("Quadro inválido."),
  nome: nomeSchema,
  cliente_id: z.string().uuid().optional().nullable(),
  data_entrega: z.string().optional().nullable(),
});

export type GrupoState =
  | { error?: string; ok?: true; id?: string; nome?: string }
  | undefined;

// ============================================================================
// HELPER — valida que `quadroId` pertence à agência
// ============================================================================
async function buscarQuadroDaAgencia(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  quadroId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("tarefa_quadros")
    .select("id")
    .eq("id", quadroId)
    .eq("agencia_id", aid)
    .maybeSingle();
  return !!data?.id;
}

async function buscarGrupoDaAgencia(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  grupoId: string
) {
  const { data } = await supabase
    .from("tarefa_grupos")
    .select("id, agencia_id, quadro_id, manual")
    .eq("id", grupoId)
    .maybeSingle();
  if (!data || data.agencia_id !== aid) return null;
  return data;
}

// ============================================================================
// HELPER — resolve ou cria um grupo AUTOMÁTICO a partir de uma entrada
// do planejamento. Usado por `sincronizarTarefaDaEntrada` em
// agencia-actions.ts. Se clienteId for null, retorna null (tarefa avulsa
// não entra em grupo automático).
// ============================================================================
export async function resolverOuCriarGrupoEntrega(args: {
  aid: string;
  quadroId: string;
  clienteId: string | null;
  dataEntrega: string | null; // YYYY-MM-DD ou null
  clienteNome: string | null; // só pra formatar o nome
}): Promise<string | null> {
  const { aid, quadroId, clienteId, dataEntrega, clienteNome } = args;
  if (!clienteId || !dataEntrega) return null;

  const supabase = createClient();

  // 1) Busca grupo existente.
  const { data: existente } = await supabase
    .from("tarefa_grupos")
    .select("id")
    .eq("agencia_id", aid)
    .eq("quadro_id", quadroId)
    .eq("cliente_id", clienteId)
    .eq("data_entrega", dataEntrega)
    .eq("manual", false)
    .maybeSingle();
  if (existente?.id) return existente.id;

  // 2) Cria. O unique index idx_tarefa_grupos_auto protege de corrida
  //    (se duas entradas virarem tarefa ao mesmo tempo, a 2ª insert
  //    falha com unique violation e a gente re-busca).
  const dataFmt = dataEntrega.split("-").reverse().join("/");
  const nome = `Artes — ${clienteNome ?? "cliente"} • Entrega ${dataFmt}`;
  const { data: criado, error: insErr } = await supabase
    .from("tarefa_grupos")
    .insert({
      agencia_id: aid,
      quadro_id: quadroId,
      nome,
      cliente_id: clienteId,
      data_entrega: dataEntrega,
      manual: false,
    })
    .select("id")
    .single();
  if (insErr) {
    // Corrida: o índice unique barrou. Re-busca e devolve o existente.
    if (insErr.code === "23505") {
      const { data: retry } = await supabase
        .from("tarefa_grupos")
        .select("id")
        .eq("agencia_id", aid)
        .eq("quadro_id", quadroId)
        .eq("cliente_id", clienteId)
        .eq("data_entrega", dataEntrega)
        .eq("manual", false)
        .maybeSingle();
      return retry?.id ?? null;
    }
    console.error("[resolverOuCriarGrupoEntrega] erro ao criar grupo:", insErr);
    return null;
  }
  return criado?.id ?? null;
}

// ============================================================================
// CRIAR (manual)
// ============================================================================
export async function criarGrupoAction(
  _prev: GrupoState,
  formData: FormData
): Promise<GrupoState> {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const raw = {
    quadro_id: formData.get("quadro_id"),
    nome: formData.get("nome"),
    cliente_id: formData.get("cliente_id") || null,
    data_entrega: formData.get("data_entrega") || null,
  };
  const parsed = grupoSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Quadro precisa ser da agência.
  if (!(await buscarQuadroDaAgencia(supabase, aid, parsed.data.quadro_id))) {
    return { error: "Quadro inválido." };
  }

  // Cliente (se informado) precisa ser da agência.
  if (parsed.data.cliente_id) {
    const { data: cli } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", parsed.data.cliente_id)
      .eq("agencia_id", aid)
      .maybeSingle();
    if (!cli) return { error: "Cliente inválido." };
  }

  const { data, error } = await supabase
    .from("tarefa_grupos")
    .insert({
      agencia_id: aid,
      quadro_id: parsed.data.quadro_id,
      nome: parsed.data.nome,
      cliente_id: parsed.data.cliente_id ?? null,
      data_entrega: parsed.data.data_entrega ?? null,
      manual: true,
    })
    .select("id, nome")
    .single();
  if (error) {
    console.error("[criarGrupoAction] supabase error:", error);
    return { error: "Erro ao criar agrupamento." };
  }
  revalidatePath("/admin/tarefas");
  return { ok: true, id: data.id, nome: data.nome };
}

// ============================================================================
// RENOMEAR
// ============================================================================
export async function renomearGrupoAction(
  id: string,
  novoNome: string
): Promise<GrupoState> {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const parsed = nomeSchema.safeParse(novoNome);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }
  const g = await buscarGrupoDaAgencia(supabase, aid, id);
  if (!g) return { error: "Agrupamento não encontrado." };

  const { error } = await supabase
    .from("tarefa_grupos")
    .update({ nome: parsed.data })
    .eq("id", id);
  if (error) return { error: "Erro ao renomear." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id };
}

// ============================================================================
// EXCLUIR
// Tarefas do grupo ficam com grupo_id=null via ON DELETE SET NULL.
// ============================================================================
export async function excluirGrupoAction(id: string): Promise<GrupoState> {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const g = await buscarGrupoDaAgencia(supabase, aid, id);
  if (!g) return { error: "Agrupamento não encontrado." };

  const { error } = await supabase.from("tarefa_grupos").delete().eq("id", id);
  if (error) return { error: "Erro ao excluir." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id };
}

// ============================================================================
// ATRIBUIR TAREFA A UM GRUPO (ou remover do grupo: grupoId=null)
// ============================================================================
export async function atribuirTarefaAoGrupoAction(
  tarefaId: string,
  grupoId: string | null
): Promise<GrupoState> {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  // Tarefa precisa ser da agência.
  const { data: t } = await supabase
    .from("tarefas")
    .select("id, agencia_id, quadro_id, grupo_id")
    .eq("id", tarefaId)
    .eq("agencia_id", aid)
    .maybeSingle();
  if (!t) return { error: "Tarefa não encontrada." };

  // Grupo (se enviado) precisa ser da agência E do mesmo quadro da tarefa.
  if (grupoId) {
    const g = await buscarGrupoDaAgencia(supabase, aid, grupoId);
    if (!g) return { error: "Agrupamento não encontrado." };
    if (g.quadro_id !== t.quadro_id) {
      return { error: "O agrupamento precisa ser do mesmo quadro da tarefa." };
    }
  }

  const { error } = await supabase
    .from("tarefas")
    .update({ grupo_id: grupoId })
    .eq("id", tarefaId)
    .eq("agencia_id", aid);
  if (error) return { error: "Erro ao atribuir agrupamento." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id: tarefaId };
}
