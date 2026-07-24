import { Suspense } from "react";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { KanbanBoard } from "@/components/tarefas/KanbanBoard";
import { TarefasPeriodoNav } from "@/components/tarefas/TarefasPeriodoNav";
import { QuadroTabs } from "@/components/tarefas/QuadroTabs";
import { prazoDentroPeriodo, periodoRef, type Periodo } from "@/lib/planejamento";
import type { TarefaStatus, TarefaPrioridade, TarefaQuadro } from "@/types/database";

export const metadata = { title: "Tarefas" };

export type TarefaItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: TarefaStatus;
  prioridade: TarefaPrioridade;
  prazo: string | null;
  arquivado: boolean;
  cliente_id: string | null;
  cliente_nome: string | null;
  criado_por: string | null;
  quadro_id: string;
  grupo_id: string | null;
  grupo_nome: string | null;
  responsaveis: { id: string; nome: string }[];
  /** Entrada do planejamento vinculada (quando a tarefa veio de um post). */
  entrada: EntradaResumo | null;
};

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
  searchParams: { periodo?: string; ref?: string; quadro?: string };
}) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  // Período selecionado (semana/mês) navegável. Default = semana atual.
  const periodo: Periodo = searchParams.periodo === "mes" ? "mes" : "semana";
  const hoje = new Date();
  const refIso =
    searchParams.ref && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.ref)
      ? searchParams.ref
      : `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const { inicio, fim, label, contemHoje } = periodoRef(refIso, periodo, hoje);

  // -------------------------------------------------------------------------
  // Quadros da agência. Se não existir nenhum, cria o "Quadro geral" agora
  // (defesa — a migration 0036 já faz isso no banco, mas o app precisa
  // continuar funcionando se alguém rodar o código antes de aplicar a
  // migration).
  // -------------------------------------------------------------------------
  let { data: quadros } = await supabase
    .from("tarefa_quadros")
    .select("id, agencia_id, nome, descricao, ordem, created_by, created_at, updated_at")
    .eq("agencia_id", aid)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  if (!quadros || quadros.length === 0) {
    await supabase
      .from("tarefa_quadros")
      .insert({ agencia_id: aid, nome: "Quadro geral", ordem: 0 });
    const recarregado = await supabase
      .from("tarefa_quadros")
      .select("id, agencia_id, nome, descricao, ordem, created_by, created_at, updated_at")
      .eq("agencia_id", aid)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    quadros = recarregado.data ?? [];
  }
  const quadrosList: TarefaQuadro[] = (quadros ?? []) as TarefaQuadro[];

  // Quadro ativo: o que veio no searchParam (válido), senão o primeiro.
  const quadroParam = searchParams.quadro && UUID_RE.test(searchParams.quadro)
    ? searchParams.quadro
    : null;
  const quadroAtivo =
    quadrosList.find((q) => q.id === quadroParam) ?? quadrosList[0];

  // Tarefas da agência (com cliente vinculado). Join FK pode vir como array
  // na tipagem do supabase-js, então tratamos como any e acessamos com segurança.
  const { data: tarefasRaw } = await supabase
    .from("tarefas")
    .select(
      "id, titulo, descricao, status, prioridade, prazo, arquivado, cliente_id, criado_por, created_at, quadro_id, grupo_id, cliente:clientes(nome_empresa), grupo:tarefa_grupos(id, nome), entrada:planejamento_entradas(id, data, titulo, tipo, copy, hashtags, descricao, midia_url, estilo, status)"
    )
    .eq("agencia_id", aid)
    .eq("quadro_id", quadroAtivo.id)
    .order("created_at", { ascending: false });
  const tarefas = (tarefasRaw ?? []) as any[];

  // Responsáveis (multi-atribuição) — uma query com join para usuarios
  const ids = tarefas.map((t: any) => t.id);
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

  const itens: TarefaItem[] = tarefas.map((t: any) => {
    const cli = Array.isArray(t.cliente) ? t.cliente[0] : t.cliente;
    const ent = Array.isArray(t.entrada) ? t.entrada[0] : t.entrada;
    const grp = Array.isArray(t.grupo) ? t.grupo[0] : t.grupo;
    return {
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      status: t.status as TarefaStatus,
      prioridade: t.prioridade as TarefaPrioridade,
      prazo: t.prazo,
      arquivado: t.arquivado,
      cliente_id: t.cliente_id,
      cliente_nome: cli?.nome_empresa ?? null,
      criado_por: t.criado_por,
      quadro_id: t.quadro_id,
      grupo_id: t.grupo_id,
      grupo_nome: grp?.nome ?? null,
      responsaveis: respMap[t.id] ?? [],
      entrada: ent ?? null,
    };
  });

  // Filtra pelo período selecionado (semana/mês) a partir de `ref`.
  const visiveis = itens.filter((t) =>
    prazoDentroPeriodo(t.prazo, inicio, fim, contemHoje)
  );

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

  // Agrupamentos do quadro ativo (pra alimentar o Select no TarefaDialog
  // e os cabeçalhos de grupo no KanbanBoard).
  const { data: gruposRaw } = await supabase
    .from("tarefa_grupos")
    .select("id, nome, cliente_id, data_entrega, manual")
    .eq("agencia_id", aid)
    .eq("quadro_id", quadroAtivo.id)
    .order("manual", { ascending: false }) // automáticos primeiro
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
        description="Quadro de micro-gestão da equipe. Atribua tarefas e acompanhe o fluxo."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Tarefas" }]}
      />
      <Suspense fallback={null}>
        <QuadroTabs
          quadros={quadrosList}
          quadroAtivoId={quadroAtivo.id}
          podeEditar={podeEditarQuadros}
        />
      </Suspense>
      <Suspense fallback={null}>
        <TarefasPeriodoNav periodo={periodo} refIso={refIso} label={label} />
      </Suspense>
      <KanbanBoard
        tarefas={visiveis}
        membros={membros}
        clientes={clientes}
        quadros={quadrosList}
        grupos={grupos}
        quadroAtivoId={quadroAtivo.id}
        meuId={session.profile.id}
        meuRole={session.profile.role}
      />
    </div>
  );
}