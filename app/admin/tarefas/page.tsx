import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { KanbanBoard } from "@/components/tarefas/KanbanBoard";
import { QuadroTabs } from "@/components/tarefas/QuadroTabs";
import { QuadroEmptyStateClient } from "@/components/tarefas/QuadroEmptyStateClient";
import { periodoRef } from "@/lib/planejamento";
import { getAnexoSignedUrlAction } from "@/lib/actions/tarefa-anexo-actions";
import type { TarefaPrioridade, TarefaColuna } from "@/types/database";

export const metadata = { title: "Tarefas" };

export type TarefaItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  /** Coluna atual da tarefa (FK; substituiu o antigo `status` texto). */
  tarefa_coluna_id: string;
  coluna_slug: string;
  coluna_nome: string;
  prioridade: TarefaPrioridade;
  prazo: string | null;
  /** Posição dentro da coluna (numeric no DB; arrastar atualiza). */
  ordem: number;
  arquivado: boolean;
  cliente_id: string | null;
  cliente_nome: string | null;
  criado_por: string | null;
  quadro_id: string;
  grupo_id: string | null;
  grupo_nome: string | null;
  responsaveis: { id: string; nome: string }[];
  /** Labels aplicados à tarefa (N-N). */
  labels: { id: string; nome: string; cor: string }[];
  /** Resumo agregado das checklists da tarefa (soma de todas). */
  checklists_resumo: { total: number; concluidos: number };
  /** Quantidade de anexos. */
  anexos_count: number;
  /** Lista de anexos (com signed URL) — usada nos dialogs. */
  anexos: AnexoResumo[];
  /** Checklists completas com itens — usada nos dialogs. */
  checklists: ChecklistResumo[];
  /** Entrada do planejamento vinculada (quando a tarefa veio de um post). */
  entrada: EntradaResumo | null;
};

export type AnexoResumo = {
  id: string;
  nome_original: string;
  mime: string;
  tamanho: number;
  url: string;
};

export type ChecklistResumo = {
  id: string;
  nome: string;
  itens: { id: string; texto: string; concluido: boolean }[];
};

export type LabelOption = { id: string; nome: string; cor: string };

export type TarefaGrupoOption = {
  id: string;
  nome: string;
  cliente_id: string | null;
  data_entrega: string | null;
  manual: boolean;
};

export type EntradaResumo = {
  id: string;
  data: string;
  titulo: string;
  tipo: string;
  copy: string | null;
  hashtags: string[] | null;
  descricao: string | null;
  midia_url: string[] | null;
  estilo: string | null;
  status: string;
};

export type MembroOption = { id: string; nome: string; cargo: string | null };
export type ClienteOption = { id: string; nome_empresa: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: { quadro?: string };
}) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  // -------------------------------------------------------------------------
  // Quadros da agência. Se não existir nenhum, NÃO cria automaticamente
  // (UX confirmada com o usuário: empty state com botão "Criar").
  // -------------------------------------------------------------------------
  const { data: quadros } = await supabase
    .from("tarefa_quadros")
    .select("id, agencia_id, nome, descricao, ordem, created_by, created_at, updated_at")
    .eq("agencia_id", aid)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  const quadrosList = (quadros ?? []) as unknown as import("@/types/database").TarefaQuadro[];

  // Sem quadros → empty state com botões "desta semana" / "próxima semana".
  if (quadrosList.length === 0) {
    const hoje = new Date();
    const refIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const semanaAtual = periodoRef(refIso, "semana", hoje);
    const proximaRef = (() => {
      const d = new Date(hoje);
      d.setDate(d.getDate() + 7);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const proximaSemana = periodoRef(proximaRef, "semana", hoje);
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tarefas"
          description="Quadros no estilo Trello: cada quadro é uma janela (semana, projeto). Crie o primeiro para começar."
          breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Tarefas" }]}
        />
        <QuadroEmptyStateClient
          labelSemanaAtual={semanaAtual.label}
          labelProximaSemana={proximaSemana.label}
        />
      </div>
    );
  }

  // Quadro ativo: o que veio no searchParam (válido), senão o primeiro.
  const quadroParam = searchParams.quadro && UUID_RE.test(searchParams.quadro)
    ? searchParams.quadro
    : null;
  const quadroAtivo =
    quadrosList.find((q) => q.id === quadroParam) ?? quadrosList[0];
  if (!quadroAtivo) redirect("/admin/tarefas");

  // -------------------------------------------------------------------------
  // Colunas do quadro ativo (sem arquivadas). Cada coluna tem slug + nome
  // editável (migration 0040). Também buscamos as colunas de TODOS os quadros
  // da agência pra alimentar o MoverQuadroDialog.
  // -------------------------------------------------------------------------
  const { data: colunasRaw } = await supabase
    .from("tarefa_colunas")
    .select("id, agencia_id, quadro_id, slug, nome, ordem, arquivada, cor, created_at, updated_at")
    .eq("quadro_id", quadroAtivo.id)
    .eq("arquivada", false)
    .order("ordem", { ascending: true });
  const colunas: TarefaColuna[] = (colunasRaw ?? []) as TarefaColuna[];

  // Mapa de colunas por quadro (para MoverQuadroDialog) — só nome + id
  const { data: todasColunas } = await supabase
    .from("tarefa_colunas")
    .select("id, quadro_id, nome, ordem, arquivada")
    .eq("agencia_id", aid)
    .eq("arquivada", false)
    .order("ordem", { ascending: true });
  const colunasPorQuadro: Record<string, { id: string; nome: string }[]> = {};
  for (const c of (todasColunas ?? []) as any[]) {
    (colunasPorQuadro[c.quadro_id] ??= []).push({
      id: c.id,
      nome: c.nome,
    });
  }

  // -------------------------------------------------------------------------
  // Tarefas da agência (com cliente vinculado e join em tarefa_colunas).
  // Ordena por `ordem` (crescente) pra preservar posições de drag; usa
  // created_at como desempate.
  // -------------------------------------------------------------------------
  const { data: tarefasRaw } = await supabase
    .from("tarefas")
    .select(
      "id, titulo, descricao, tarefa_coluna_id, prioridade, prazo, ordem, arquivado, cliente_id, criado_por, created_at, quadro_id, grupo_id, tarefa_coluna:tarefa_colunas(slug, nome), cliente:clientes(nome_empresa), grupo:tarefa_grupos(id, nome), entrada:planejamento_entradas(id, data, titulo, tipo, copy, hashtags, descricao, midia_url, estilo, status)"
    )
    .eq("agencia_id", aid)
    .eq("quadro_id", quadroAtivo.id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: false });
  const tarefas = (tarefasRaw ?? []) as any[];

  // IDs pra batch queries auxiliares
  const ids = tarefas.map((t: any) => t.id);

  // Responsáveis (multi-atribuição)
  let respMap: Record<string, { id: string; nome: string }[]> = {};
  if (ids.length > 0) {
    const { data: respRaw } = await supabase
      .from("tarefa_responsaveis")
      .select("tarefa_id, usuario:usuarios(id, nome)")
      .in("tarefa_id", ids);
    for (const r of (respRaw ?? []) as any[]) {
      const u = Array.isArray(r.usuario) ? r.usuario[0] : r.usuario;
      if (!u) continue;
      (respMap[r.tarefa_id] ??= []).push({ id: u.id, nome: u.nome });
    }
  }

  // Labels da agência (catálogo — pro picker)
  const { data: labelsRaw } = await supabase
    .from("tarefa_labels")
    .select("id, nome, cor, ordem")
    .eq("agencia_id", aid)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  const labelsOptions: LabelOption[] = (labelsRaw ?? []).map((l: any) => ({
    id: l.id,
    nome: l.nome,
    cor: l.cor,
  }));

  // Labels aplicadas em cada tarefa (N-N, batch)
  let labelsPorTarefa: Record<string, { id: string; nome: string; cor: string }[]> = {};
  if (ids.length > 0) {
    const { data: vinculos } = await supabase
      .from("tarefa_label_vinculos")
      .select("tarefa_id, label:tarefa_labels(id, nome, cor)")
      .in("tarefa_id", ids);
    for (const v of (vinculos ?? []) as any[]) {
      const lb = Array.isArray(v.label) ? v.label[0] : v.label;
      if (!lb) continue;
      (labelsPorTarefa[v.tarefa_id] ??= []).push(lb);
    }
  }

  // Resumo de checklists por tarefa (soma de concluídos / total) + checklists
  // completas pra exibir nos dialogs (read + edit).
  let checklistsResumo: Record<string, { total: number; concluidos: number }> = {};
  const checklistsPorTarefa: Record<string, ChecklistResumo[]> = {};
  if (ids.length > 0) {
    const { data: checklistsRaw } = await supabase
      .from("tarefa_checklists")
      .select(
        "id, nome, tarefa_id, ordem, itens:tarefa_checklist_itens(id, texto, concluido, ordem)"
      )
      .in("tarefa_id", ids)
      .order("ordem", { ascending: true });
    for (const c of (checklistsRaw ?? []) as any[]) {
      const itensOrdenados = (c.itens ?? [])
        .map((i: any) => ({
          id: i.id,
          texto: i.texto,
          concluido: i.concluido,
        }))
        .sort(
          (a: any, b: any) =>
            (a.ordem ?? 0) - (b.ordem ?? 0)
        );
      checklistsPorTarefa[c.tarefa_id] ??= [];
      checklistsPorTarefa[c.tarefa_id].push({
        id: c.id,
        nome: c.nome,
        itens: itensOrdenados,
      });
      const r = (checklistsResumo[c.tarefa_id] ??= {
        total: 0,
        concluidos: 0,
      });
      for (const i of itensOrdenados) {
        r.total += 1;
        if (i.concluido) r.concluidos += 1;
      }
    }
  }

  // Anexos por tarefa (lista completa + signed URL pra exibir nos dialogs)
  let anexosCount: Record<string, number> = {};
  const anexosPorTarefa: Record<string, AnexoResumo[]> = {};
  if (ids.length > 0) {
    const { data: anexos } = await supabase
      .from("tarefa_anexos")
      .select("id, tarefa_id, nome_original, mime, tamanho")
      .in("tarefa_id", ids)
      .order("created_at", { ascending: true });
    // signed URLs geradas em paralelo (mas cada chamada é uma action, então
      // pra não estourarem quota, vamos serializar — ainda assim, é barato)
    for (const a of (anexos ?? []) as any[]) {
      anexosCount[a.tarefa_id] = (anexosCount[a.tarefa_id] ?? 0) + 1;
      const urlRes = await getAnexoSignedUrlAction(a.id);
      if (urlRes?.signedUrl) {
        (anexosPorTarefa[a.tarefa_id] ??= []).push({
          id: a.id,
          nome_original: a.nome_original,
          mime: a.mime,
          tamanho: a.tamanho,
          url: urlRes.signedUrl,
        });
      }
    }
  }

  const colMap: Record<string, TarefaColuna> = {};
  for (const c of colunas) colMap[c.id] = c;

  const itens: TarefaItem[] = tarefas.map((t: any) => {
    const cli = Array.isArray(t.cliente) ? t.cliente[0] : t.cliente;
    const ent = Array.isArray(t.entrada) ? t.entrada[0] : t.entrada;
    const grp = Array.isArray(t.grupo) ? t.grupo[0] : t.grupo;
    const col = Array.isArray(t.tarefa_coluna) ? t.tarefa_coluna[0] : t.tarefa_coluna;
    const colMeta = colMap[t.tarefa_coluna_id];
    return {
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      tarefa_coluna_id: t.tarefa_coluna_id,
      coluna_slug: col?.slug ?? colMeta?.slug ?? "destinada",
      coluna_nome: col?.nome ?? colMeta?.nome ?? "A Fazer",
      prioridade: t.prioridade as TarefaPrioridade,
      prazo: t.prazo,
      ordem: Number(t.ordem ?? 0),
      arquivado: t.arquivado,
      cliente_id: t.cliente_id,
      cliente_nome: cli?.nome_empresa ?? null,
      criado_por: t.criado_por,
      quadro_id: t.quadro_id,
      grupo_id: t.grupo_id,
      grupo_nome: grp?.nome ?? null,
      responsaveis: respMap[t.id] ?? [],
      labels: labelsPorTarefa[t.id] ?? [],
      checklists_resumo: checklistsResumo[t.id] ?? { total: 0, concluidos: 0 },
      checklists: checklistsPorTarefa[t.id] ?? [],
      anexos_count: anexosCount[t.id] ?? 0,
      anexos: anexosPorTarefa[t.id] ?? [],
      entrada: ent ?? null,
    };
  });

  // Membros ativos para atribuição (exclui clientes — eles não recebem tarefas)
  const { data: membrosRaw } = await supabase
    .from("usuarios")
    .select("id, nome, cargo")
    .eq("agencia_id", aid)
    .in("role", ["admin_agencia", "membro_equipe"])
    .eq("ativo", true)
    .order("nome");
  const membros: MembroOption[] = (membrosRaw ?? []).map((m: any) => ({
    id: m.id,
    nome: m.nome,
    cargo: m.cargo,
  }));

  // Clientes para vínculo opcional
  const { data: clientesRaw } = await supabase
    .from("clientes")
    .select("id, nome_empresa")
    .eq("agencia_id", aid)
    .order("nome_empresa");
  const clientes: ClienteOption[] = (clientesRaw ?? []).map((c: any) => ({
    id: c.id,
    nome_empresa: c.nome_empresa,
  }));

  // Agrupamentos do quadro ativo
  const { data: gruposRaw } = await supabase
    .from("tarefa_grupos")
    .select("id, nome, cliente_id, data_entrega, manual")
    .eq("agencia_id", aid)
    .eq("quadro_id", quadroAtivo.id)
    .order("manual", { ascending: false })
    .order("nome", { ascending: true });
  const grupos: TarefaGrupoOption[] = (gruposRaw ?? []).map((g: any) => ({
    id: g.id,
    nome: g.nome,
    cliente_id: g.cliente_id,
    data_entrega: g.data_entrega,
    manual: g.manual,
  }));

  const podeEditarQuadros = session.profile.role === "admin_agencia";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas"
        description="Quadro no estilo Trello. Crie quadros por semana ou projeto, arraste tarefas entre colunas."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Tarefas" }]}
      />
      <Suspense fallback={null}>
        <QuadroTabs
          quadros={quadrosList}
          quadroAtivoId={quadroAtivo.id}
          podeEditar={podeEditarQuadros}
        />
      </Suspense>
      <KanbanBoard
        tarefas={itens}
        membros={membros}
        clientes={clientes}
        quadros={quadrosList}
        grupos={grupos}
        colunas={colunas}
        colunasPorQuadro={colunasPorQuadro}
        labels={labelsOptions}
        quadroAtivoId={quadroAtivo.id}
        meuId={session.profile.id}
        meuRole={session.profile.role}
      />
    </div>
  );
}
