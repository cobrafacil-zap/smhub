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
  .max(40, "Nome muito longo (máx. 40 caracteres).");

const slugCanônico = z.enum([
  "destinada",
  "em_andamento",
  "pronta",
  "entregue",
]);

const criarColunaSchema = z.object({
  quadro_id: z.string().uuid("Quadro inválido."),
  nome: nomeSchema,
  slug: z.union([slugCanônico, z.string().regex(/^custom-[a-z0-9-]+$/)]).optional(),
});

export type ColunaState = {
  error?: string;
  ok?: boolean;
  id?: string;
} | undefined;

// ============================================================================
// HELPERS
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

async function buscarColunaDaAgencia(
  supabase: ReturnType<typeof createClient>,
  aid: string,
  colunaId: string
) {
  const { data } = await supabase
    .from("tarefa_colunas")
    .select("id, agencia_id, quadro_id, slug")
    .eq("id", colunaId)
    .maybeSingle();
  if (!data || data.agencia_id !== aid) return null;
  return data;
}

/** Próxima `ordem` disponível num quadro. */
async function proximaOrdem(
  supabase: ReturnType<typeof createClient>,
  quadroId: string
): Promise<number> {
  const { data } = await supabase
    .from("tarefa_colunas")
    .select("ordem")
    .eq("quadro_id", quadroId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.ordem ?? -1) + 1;
}

/** Gera um slug `custom-<token>` único dentro do quadro. */
function gerarSlugCustom(): string {
  // 8 chars do uuid v4 sem traços, prefixo "custom-".
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `custom-${token}`;
}

// ============================================================================
// CRIAR
// ============================================================================
//
// Reaproveitada também pra semear as 4 colunas default quando um quadro é
// criado: chamar com `slug` igual a um dos 4 canônicos cria coluna default
// (caso o caller queira um conjunto customizado, pode passar `slug` vazio
// e a action gera `custom-<uuid>`).
// ============================================================================
export async function criarColunaAction(
  _prev: ColunaState,
  formData: FormData
): Promise<ColunaState> {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const parsed = criarColunaSchema.safeParse({
    quadro_id: formData.get("quadro_id"),
    nome: formData.get("nome"),
    slug: formData.get("slug") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (!(await buscarQuadroDaAgencia(supabase, aid, parsed.data.quadro_id))) {
    return { error: "Quadro inválido." };
  }

  // Resolve slug final: canônico (se ainda não usado no quadro) ou custom.
  let slugFinal = parsed.data.slug;
  if (!slugFinal) slugFinal = gerarSlugCustom();

  // Se for canônico e já existir no quadro, erro explícito (impede duplicar).
  if (slugFinal !== gerarSlugCustom.toString() && slugFinal.startsWith("custom-") === false) {
    const { data: existe } = await supabase
      .from("tarefa_colunas")
      .select("id")
      .eq("quadro_id", parsed.data.quadro_id)
      .eq("slug", slugFinal)
      .maybeSingle();
    if (existe?.id) {
      return { error: "Já existe uma coluna com esse slug neste quadro." };
    }
  }

  const ordem = await proximaOrdem(supabase, parsed.data.quadro_id);

  const { data, error } = await supabase
    .from("tarefa_colunas")
    .insert({
      agencia_id: aid,
      quadro_id: parsed.data.quadro_id,
      slug: slugFinal,
      nome: parsed.data.nome,
      ordem,
      arquivada: false,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[criarColunaAction] supabase error:", error);
    return { error: "Erro ao criar coluna." };
  }
  revalidatePath("/admin/tarefas");
  return { ok: true, id: data.id };
}

// ============================================================================
// RENOMEAR
// ============================================================================
export async function renomearColunaAction(
  id: string,
  novoNome: string
): Promise<ColunaState> {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const parsed = nomeSchema.safeParse(novoNome);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }
  const c = await buscarColunaDaAgencia(supabase, aid, id);
  if (!c) return { error: "Coluna não encontrada." };

  const { error } = await supabase
    .from("tarefa_colunas")
    .update({ nome: parsed.data })
    .eq("id", id);
  if (error) return { error: "Erro ao renomear coluna." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id };
}

// ============================================================================
// EXCLUIR
//
// Só permite excluir se a coluna estiver vazia (sem tarefas). Caso
// contrário, devolve erro amigável pedindo pra mover as tarefas antes.
// ============================================================================
export async function excluirColunaAction(id: string): Promise<ColunaState> {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const c = await buscarColunaDaAgencia(supabase, aid, id);
  if (!c) return { error: "Coluna não encontrada." };

  // Bloqueia exclusão se houver tarefas apontando pra coluna.
  const { count } = await supabase
    .from("tarefas")
    .select("id", { count: "exact", head: true })
    .eq("tarefa_coluna_id", id);
  if ((count ?? 0) > 0) {
    return {
      error:
        "Esta coluna ainda tem tarefas. Mova-as para outra coluna antes de excluir.",
    };
  }

  const { error } = await supabase.from("tarefa_colunas").delete().eq("id", id);
  if (error) return { error: "Erro ao excluir coluna." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id };
}

// ============================================================================
// MOVER COLUNA (subir/descer 1 posição)
//
// Atualiza a `ordem` da coluna alvo e do vizinho pra fazer swap. Mantém
// os outros valores de `ordem` consistentes via ordenação densa: a coluna
// que desce recebe a ordem do alvo e vice-versa.
// ============================================================================
export async function moverColunaAction(
  id: string,
  direcao: "cima" | "baixo"
): Promise<ColunaState> {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const c = await buscarColunaDaAgencia(supabase, aid, id);
  if (!c) return { error: "Coluna não encontrada." };

  // Lista colunas do mesmo quadro em ordem.
  const { data: cols } = await supabase
    .from("tarefa_colunas")
    .select("id, ordem")
    .eq("quadro_id", c.quadro_id)
    .eq("arquivada", false)
    .order("ordem", { ascending: true });

  if (!cols || cols.length < 2) return { ok: true, id };

  const idx = cols.findIndex((x) => x.id === id);
  const swapIdx = direcao === "cima" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= cols.length) return { ok: true, id };

  const a = cols[idx];
  const b = cols[swapIdx];

  // Swap de ordem (ordem original de `a` vai pra `b` e vice-versa).
  const { error } = await supabase.rpc
    ? await swapOrdens(supabase, a.id, b.id, a.ordem, b.ordem)
    : await swapOrdensFallback(supabase, a.id, b.id, a.ordem, b.ordem);
  if (error) return { error: "Erro ao reordenar colunas." };

  revalidatePath("/admin/tarefas");
  return { ok: true, id };
}

// Sem RPC dedicado (mantém a migration enxuta), faz swap em duas updates
// usando uma ordem temporária negativa pra não violar a constraint única.
async function swapOrdens(
  supabase: ReturnType<typeof createClient>,
  idA: string,
  idB: string,
  ordemA: number,
  ordemB: number
): Promise<{ error: string | null }> {
  // temp negativa única
  const temp = -Math.floor(Date.now() / 1000) - Math.max(ordemA, ordemB);
  await supabase.from("tarefa_colunas").update({ ordem: temp }).eq("id", idA);
  await supabase.from("tarefa_colunas").update({ ordem: ordemA }).eq("id", idB);
  await supabase.from("tarefa_colunas").update({ ordem: ordemB }).eq("id", idA);
  return { error: null };
}

// Fallback (não usado; só pra satisfazer o ternário acima).
async function swapOrdensFallback(
  supabase: ReturnType<typeof createClient>,
  idA: string,
  idB: string,
  ordemA: number,
  ordemB: number
) {
  return swapOrdens(supabase, idA, idB, ordemA, ordemB);
}

// ============================================================================
// DEFINIR COR (cor de capa por coluna)
//
// cor pode ser null (limpa a cor) ou um hex (#RRGGBB).
// ============================================================================
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function definirCorColunaAction(
  id: string,
  cor: string | null
): Promise<ColunaState> {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  if (cor !== null && !HEX_COLOR.test(cor)) {
    return { error: "Cor deve ser hex (#RRGGBB)." };
  }
  const c = await buscarColunaDaAgencia(supabase, aid, id);
  if (!c) return { error: "Coluna não encontrada." };

  const { error } = await supabase
    .from("tarefa_colunas")
    .update({ cor })
    .eq("id", id);
  if (error) return { error: "Erro ao atualizar cor da coluna." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id };
}

// ============================================================================
// MOVER COLUNA ENTRE (drag livre — recebe os 2 vizinhos no ponto de drop)
//
// Estratégia: em vez de fazer swap, colocamos `idA` ANTES de `idB`
// recalculando ordens em batch. Usa-se uma "fenda" numérica temporária
// pra não violar nenhuma constraint, e depois normaliza com passo 1024
// só no intervalo afetado.
// ============================================================================
async function reordenarColunasNoQuadro(
  supabase: ReturnType<typeof createClient>,
  quadroId: string
): Promise<void> {
  const { data: cols } = await supabase
    .from("tarefa_colunas")
    .select("id, ordem")
    .eq("quadro_id", quadroId)
    .eq("arquivada", false)
    .order("ordem", { ascending: true });
  if (!cols) return;
  let i = 1;
  for (const c of cols) {
    await supabase
      .from("tarefa_colunas")
      .update({ ordem: i * 1024 })
      .eq("id", c.id);
    i += 1;
  }
}

export async function moverColunaEntreAction(
  idArrastada: string,
  idColunaVizinha: string
): Promise<ColunaState> {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();

  const a = await buscarColunaDaAgencia(supabase, aid, idArrastada);
  if (!a) return { error: "Coluna arrastada não encontrada." };
  const b = await buscarColunaDaAgencia(supabase, aid, idColunaVizinha);
  if (!b) return { error: "Coluna vizinha não encontrada." };
  if (a.quadro_id !== b.quadro_id) {
    return { error: "Colunas devem estar no mesmo quadro." };
  }

  // Se a coluna arrastada é a mesma que a vizinha, não faz nada.
  if (idArrastada === idColunaVizinha) return { ok: true, id: idArrastada };

  // Renumera o quadro inteiro com passos 1024, depois troca a posição da
  // arrastada pra imediatamente antes da vizinha. Mais simples que tentar
  // calcular uma "fenda" — quadro raramente tem mais que ~10 colunas.
  await reordenarColunasNoQuadro(supabase, a.quadro_id);

  // Re-lê as colunas com a ordem nova
  const { data: cols } = await supabase
    .from("tarefa_colunas")
    .select("id, ordem")
    .eq("quadro_id", a.quadro_id)
    .eq("arquivada", false)
    .order("ordem", { ascending: true });
  if (!cols) return { ok: true, id: idArrastada };

  const idxVizinha = cols.findIndex((c) => c.id === idColunaVizinha);
  if (idxVizinha === -1) return { ok: true, id: idArrastada };

  // Remove a arrastada e reinsere antes da vizinha.
  const semArrastada = cols.filter((c) => c.id !== idArrastada);
  const insertIdx = idxVizinha; // já considerando que removemos a arrastada
  const ordemAnterior = insertIdx === 0 ? 0 : Number(semArrastada[insertIdx - 1].ordem);
  const ordemPosterior =
    insertIdx >= semArrastada.length
      ? Number(semArrastada[semArrastada.length - 1].ordem) + 1024
      : Number(semArrastada[insertIdx].ordem);
  const novaOrdem =
    ordemAnterior === 0
      ? ordemPosterior - 512
      : (ordemAnterior + ordemPosterior) / 2;

  // Se a fenda é menor que 1e-9, normaliza de novo (defesa em profundidade).
  if (
    ordemPosterior - ordemAnterior < 1e-9 &&
    insertIdx > 0 &&
    insertIdx < semArrastada.length
  ) {
    await reordenarColunasNoQuadro(supabase, a.quadro_id);
    return { ok: true, id: idArrastada };
  }

  const { error } = await supabase
    .from("tarefa_colunas")
    .update({ ordem: novaOrdem })
    .eq("id", idArrastada);
  if (error) return { error: "Erro ao mover coluna." };
  revalidatePath("/admin/tarefas");
  return { ok: true, id: idArrastada };
}

// ============================================================================
// CRIAR QUADRO
//
// Action usada pelo atalho "Criar desta semana" / "Criar da próxima
// semana" e pelo "+ Novo quadro". Cria APENAS o quadro — as colunas
// ficam por conta do admin, que adiciona via "+ Adicionar outra lista"
// no kanban. Isso mantém o fluxo realmente Trello-style (sem conjuntos
// pré-definidos que não combinam com a realidade do cliente).
// ============================================================================
export async function criarQuadroComColunasAction(formData: FormData): Promise<{
  error?: string;
  ok?: boolean;
  id?: string;
}> {
  const session = await requireAgenciaMember();
  if (session.profile.role !== "admin_agencia") {
    return { error: "Apenas administradores podem criar quadros." };
  }
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const nome = String(formData.get("nome") ?? "").trim();
  if (nome.length < 1 || nome.length > 80) {
    return { error: "Nome do quadro é obrigatório (máx. 80 caracteres)." };
  }

  // Próxima ordem
  const { data: maxRow } = await supabase
    .from("tarefa_quadros")
    .select("ordem")
    .eq("agencia_id", aid)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const proximaOrdemQuadro = (maxRow?.ordem ?? -1) + 1;

  const { data: quadro, error: qErr } = await supabase
    .from("tarefa_quadros")
    .insert({
      agencia_id: aid,
      nome,
      ordem: proximaOrdemQuadro,
      created_by: session.profile.id,
    })
    .select("id")
    .single();
  if (qErr || !quadro) {
    return { error: `Erro ao criar quadro: ${qErr?.message ?? "desconhecido"}` };
  }

  revalidatePath("/admin/tarefas");
  return { ok: true, id: quadro.id };
}
