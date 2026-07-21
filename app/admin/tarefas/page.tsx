import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { KanbanBoard } from "@/components/tarefas/KanbanBoard";
import { prazoDentroJanelaDuasSemanas } from "@/lib/planejamento";
import type { TarefaStatus, TarefaPrioridade } from "@/types/database";

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
  responsaveis: { id: string; nome: string }[];
  /** Entrada do planejamento vinculada (quando a tarefa veio de um post). */
  entrada: EntradaResumo | null;
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

export default async function TarefasPage() {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  // Tarefas da agência (com cliente vinculado). Join FK pode vir como array
  // na tipagem do supabase-js, então tratamos como any e acessamos com segurança.
  const { data: tarefasRaw } = await supabase
    .from("tarefas")
    .select(
      "id, titulo, descricao, status, prioridade, prazo, arquivado, cliente_id, criado_por, created_at, cliente:clientes(nome_empresa), entrada:planejamento_entradas(id, data, titulo, tipo, copy, hashtags, descricao, midia_url, estilo, status)"
    )
    .eq("agencia_id", aid)
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
      responsaveis: respMap[t.id] ?? [],
      entrada: ent ?? null,
    };
  });

  // Janela de entrega: só esta semana + próxima semana (e atrasadas).
  // Tarefas com prazo daqui 2 semanas ou mais ficam ocultas do quadro.
  const visiveis = itens.filter((t) => prazoDentroJanelaDuasSemanas(t.prazo));

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas"
        description="Quadro de micro-gestão da equipe. Atribua tarefas e acompanhe o fluxo."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Tarefas" }]}
      />
      <KanbanBoard
        tarefas={visiveis}
        membros={membros}
        clientes={clientes}
        meuId={session.profile.id}
        meuRole={session.profile.role}
      />
    </div>
  );
}