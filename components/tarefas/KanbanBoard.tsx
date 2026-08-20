"use client";

import { useMemo, useState, useTransition, useEffect, useRef, useCallback } from "react";
import { Plus, Filter, Package, MoreHorizontal, Pencil, Trash2, X, Check, ArrowUp, ArrowDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { moverTarefaAction } from "@/lib/actions/tarefa-actions";
import { renomearGrupoAction, excluirGrupoAction } from "@/lib/actions/grupo-actions";
import {
  criarColunaAction,
  renomearColunaAction,
  excluirColunaAction,
  moverColunaAction,
} from "@/lib/actions/coluna-actions";
import { Reveal } from "@/components/ui/motion/Reveal";
import { TarefaCard } from "./TarefaCard";
import { TarefaDialog } from "./TarefaDialog";
import { TarefaDetailDialog } from "./TarefaDetailDialog";
import type { ClienteOption, MembroOption, TarefaGrupoOption, TarefaItem } from "@/app/admin/tarefas/page";
import type { TarefaColuna, TarefaQuadro } from "@/types/database";

const LIMITE_VISIVEL = 9;

export function KanbanBoard({
  tarefas,
  membros,
  clientes,
  quadros,
  grupos,
  colunas,
  quadroAtivoId,
  meuId,
  meuRole,
}: {
  tarefas: TarefaItem[];
  membros: MembroOption[];
  clientes: ClienteOption[];
  quadros: TarefaQuadro[];
  grupos: TarefaGrupoOption[];
  colunas: TarefaColuna[];
  quadroAtivoId: string;
  meuId: string;
  meuRole: string;
}) {
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [clienteId, setClienteId] = useState<string>("");
  const [minhas, setMinhas] = useState(false);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [colunaInicialDialog, setColunaInicialDialog] = useState<string | null>(null);
  const [editando, setEditando] = useState<TarefaItem | null>(null);
  const [visualizando, setVisualizando] = useState<TarefaItem | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (!mostrarArquivadas && t.arquivado) return false;
      if (minhas && !t.responsaveis.some((r) => r.id === meuId)) return false;
      if (responsavelId && !t.responsaveis.some((r) => r.id === responsavelId)) return false;
      if (clienteId && t.cliente_id !== clienteId) return false;
      return true;
    });
  }, [tarefas, mostrarArquivadas, minhas, responsavelId, clienteId, meuId]);

  const porColuna = useMemo(() => {
    const map: Record<string, TarefaItem[]> = {};
    for (const c of colunas) map[c.id] = [];
    for (const t of filtradas) {
      (map[t.tarefa_coluna_id] ??= []).push(t);
    }
    return map;
  }, [filtradas, colunas]);

  function abrirCriar(colunaId?: string) {
    setEditando(null);
    setColunaInicialDialog(colunaId ?? null);
    setDialogOpen(true);
  }
  function abrirEditar(t: TarefaItem) {
    setEditando(t);
    setColunaInicialDialog(t.tarefa_coluna_id);
    setVisualizando(null);
    setDialogOpen(true);
  }
  function abrirVer(t: TarefaItem) {
    setVisualizando(t);
  }

  function handleDrop(novaColunaId: string) {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    startTransition(async () => {
      await moverTarefaAction(id, novaColunaId);
    });
  }

  const filtroAtivo = responsavelId || clienteId || minhas;
  const podeCriar = meuRole === "admin_agencia";

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card !p-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5 min-w-[160px]">
          <label className="label flex items-center gap-1">
            <Filter className="h-3 w-3" /> Responsável
          </label>
          <Select
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
            className="w-full"
          >
            <option value="">Todos</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5 min-w-[160px]">
          <label className="label">Cliente</label>
          <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full">
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_empresa}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer h-9">
          <input
            type="checkbox"
            checked={minhas}
            onChange={(e) => setMinhas(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-royal-500"
          />
          Minhas tarefas
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer h-9">
          <input
            type="checkbox"
            checked={mostrarArquivadas}
            onChange={(e) => setMostrarArquivadas(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-royal-500"
          />
          Arquivadas
        </label>

        {podeCriar && (
          <div className="ml-auto">
            <Button iconLeft={<Plus className="h-4 w-4" />} onClick={() => abrirCriar()}>
              Nova tarefa
            </Button>
          </div>
        )}
      </div>

      {colunas.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Layers className="h-10 w-10" />}
            title="Quadro sem colunas"
            description={
              podeCriar
                ? "Adicione uma coluna para começar a organizar as tarefas."
                : "Aguarde o admin configurar as colunas deste quadro."
            }
            action={
              podeCriar ? (
                <NovaColunaForm
                  quadroId={quadroAtivoId}
                  className="max-w-xs"
                />
              ) : undefined
            }
          />
        </div>
      ) : filtradas.length === 0 && tarefas.length > 0 ? (
        <div className="card">
          <EmptyState
            icon={<Filter className="h-10 w-10" />}
            title="Nada aqui"
            description={
              filtroAtivo
                ? "Nenhuma tarefa com esses filtros. Limpe os filtros para ver tudo."
                : undefined
            }
          />
        </div>
      ) : tarefas.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Plus className="h-10 w-10" />}
            title="Nenhuma tarefa neste quadro"
            description={
              podeCriar
                ? "Clique em “Adicionar tarefa” no rodapé de uma coluna para começar."
                : "Quando o admin adicionar tarefas, elas aparecem aqui."
            }
          />
        </div>
      ) : (
        // Quadro: colunas roláveis no estilo Trello. Cada coluna = 1 tarefa_coluna
        // com nome editável, contador, drop zone e footer "+ Adicionar tarefa".
        <div className="flex gap-3 overflow-x-auto pb-2 items-start">
          {colunas.map((col) => {
            const itens = porColuna[col.id] ?? [];
            return (
              <Coluna
                key={col.id}
                coluna={col}
                totalColunas={colunas.length}
                itens={itens}
                grupos={grupos}
                quadroId={quadroAtivoId}
                dragId={dragId}
                dragOver={dragOver}
                podeCriar={podeCriar}
                podeEditar={podeCriar}
                expandedGroups={expandedGroups}
                setExpandedGroups={setExpandedGroups}
                meuId={meuId}
                meuRole={meuRole}
                onDrop={handleDrop}
                onDragStart={(id) => setDragId(id)}
                onDragEnd={() => setDragId(null)}
                onAddTarefa={() => abrirCriar(col.id)}
                onEdit={abrirEditar}
                onView={abrirVer}
              />
            );
          })}

          {/* "+ Adicionar outra lista" no fim da fileira (Trello-style) */}
          {podeCriar && (
            <div className="shrink-0 w-[280px]">
              <NovaColunaForm quadroId={quadroAtivoId} />
            </div>
          )}
        </div>
      )}

      <TarefaDialog
        open={dialogOpen}
        tarefa={editando}
        membros={membros}
        clientes={clientes}
        quadros={quadros}
        grupos={grupos}
        colunas={colunas}
        colunaIdInicial={colunaInicialDialog}
        quadroIdInicial={quadroAtivoId}
        onClose={() => setDialogOpen(false)}
      />

      <TarefaDetailDialog
        open={!!visualizando}
        tarefa={visualizando}
        colunas={colunas}
        podeEditar={podeCriar}
        onEdit={abrirEditar}
        onClose={() => setVisualizando(null)}
      />
    </div>
  );
}

// ============================================================================
// COLUNA (estilo Trello)
// ============================================================================
function Coluna({
  coluna,
  totalColunas,
  itens,
  grupos,
  dragId,
  dragOver,
  podeCriar,
  podeEditar,
  expandedGroups,
  setExpandedGroups,
  meuId,
  meuRole,
  onDrop,
  onDragStart,
  onDragEnd,
  onAddTarefa,
  onEdit,
  onView,
}: {
  coluna: TarefaColuna;
  totalColunas: number;
  itens: TarefaItem[];
  grupos: TarefaGrupoOption[];
  quadroId: string;
  dragId: string | null;
  dragOver: string | null;
  podeCriar: boolean;
  podeEditar: boolean;
  expandedGroups: Set<string>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  meuId: string;
  meuRole: string;
  onDrop: (colunaId: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onAddTarefa: () => void;
  onEdit: (t: TarefaItem) => void;
  onView: (t: TarefaItem) => void;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDrop(coluna.id); // reusa setDragOver indiretamente
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          // dragOver é controlado no pai; nada local aqui
        }
      }}
      onDrop={() => onDrop(coluna.id)}
      className={cn(
        "shrink-0 w-[280px] flex flex-col bg-bg-surface/60 rounded-xl border border-border max-h-[calc(100vh-220px)]",
        dragOver === coluna.id && dragId && "ring-2 ring-royal-500/40 bg-royal-500/5"
      )}
    >
      <ColunaHeader
        coluna={coluna}
        total={itens.length}
        podeEditar={podeEditar}
        totalColunas={totalColunas}
        indice={colunasIndex(coluna, totalColunas)}
      />
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {itens.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-6 italic">Vazio</p>
        )}
        <CardsLista
          itens={itens}
          grupos={grupos}
          colunaId={coluna.id}
          dragId={dragId}
          meuId={meuId}
          meuRole={meuRole}
          expandedGroups={expandedGroups}
          setExpandedGroups={setExpandedGroups}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onEdit={onEdit}
          onView={onView}
        />
      </div>
      {podeCriar && (
        <div className="p-2 border-t border-border">
          <button
            type="button"
            onClick={onAddTarefa}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-royal-200 hover:bg-bg-elevated transition"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar tarefa
          </button>
        </div>
      )}
    </div>
  );
}

// Helper só pra saber se a coluna está na borda (pra habilitar mover
// pra cima/baixo no menu).
function colunasIndex(coluna: TarefaColuna, total: number) {
  // A ordem real vem do pai, mas usamos a `ordem` da própria coluna.
  return coluna.ordem;
}

// ============================================================================
// CABEÇALHO DA COLUNA
// ============================================================================
function ColunaHeader({
  coluna,
  total,
  podeEditar,
  totalColunas,
  indice,
}: {
  coluna: TarefaColuna;
  total: number;
  podeEditar: boolean;
  totalColunas: number;
  indice: number;
}) {
  const [renomeando, setRenomeando] = useState(false);
  const [novoNome, setNovoNome] = useState(coluna.nome);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function handleRenomear() {
    const nome = novoNome.trim();
    if (!nome || nome === coluna.nome) {
      setRenomeando(false);
      setNovoNome(coluna.nome);
      return;
    }
    const res = await renomearColunaAction(coluna.id, nome);
    if (res?.error) {
      alert(res.error);
      return;
    }
    setRenomeando(false);
  }

  async function handleExcluir() {
    const res = await excluirColunaAction(coluna.id);
    if (res?.error) {
      alert(res.error);
    }
  }

  function handleMover(direcao: "cima" | "baixo") {
    startTransition(async () => {
      await moverColunaAction(coluna.id, direcao);
      setMenuOpen(false);
    });
  }

  return (
    <div className="flex items-center justify-between gap-1 px-2.5 py-2 border-b border-border">
      {renomeando ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRenomear();
          }}
          className="flex items-center gap-1 flex-1"
        >
          <Input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            maxLength={40}
            className="h-7 text-sm flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setRenomeando(false);
                setNovoNome(coluna.nome);
              }
            }}
          />
          <button
            type="submit"
            disabled={pending}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-emerald-400 hover:bg-bg-elevated"
            title="Salvar"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setRenomeando(false);
              setNovoNome(coluna.nome);
            }}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:bg-bg-elevated"
            title="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            onClick={() => podeEditar && setRenomeando(true)}
            className={cn(
              "flex items-center gap-2 flex-1 min-w-0 text-left text-sm font-semibold text-slate-100 truncate",
              podeEditar && "hover:text-royal-200"
            )}
            title={podeEditar ? "Clique para renomear" : coluna.nome}
            disabled={!podeEditar}
          >
            <span className="truncate">{coluna.nome}</span>
          </button>
          <span className="text-[11px] text-slate-500 bg-bg-elevated rounded-full px-2 py-0.5 shrink-0">
            {total}
          </span>
          {podeEditar && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:text-royal-200 hover:bg-bg-elevated"
                title="Ações da coluna"
                aria-label="Ações da coluna"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-lg border border-border bg-bg-elevated shadow-xl py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setRenomeando(true);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-bg-muted inline-flex items-center gap-2"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Renomear
                  </button>
                  {indice > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMover("cima")}
                      disabled={pending}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-bg-muted inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <ArrowUp className="h-3.5 w-3.5" /> Mover pra cima
                    </button>
                  )}
                  {indice < totalColunas - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMover("baixo")}
                      disabled={pending}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-bg-muted inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <ArrowDown className="h-3.5 w-3.5" /> Mover pra baixo
                    </button>
                  )}
                  <ConfirmDialog
                    trigger={
                      <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        className="w-full text-left px-3 py-1.5 text-xs text-danger-400 hover:bg-bg-muted inline-flex items-center gap-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir coluna
                      </button>
                    }
                    title={`Excluir coluna "${coluna.nome}"?`}
                    description={
                      <span>
                        As tarefas que estão nela precisam ser movidas antes. Esta ação não pode ser desfeita.
                      </span>
                    }
                    confirmText="Excluir"
                    variant="danger"
                    onConfirm={handleExcluir}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// LISTA DE CARDS (com agrupamentos)
// ============================================================================
function CardsLista({
  itens,
  grupos,
  colunaId,
  dragId,
  meuId,
  meuRole,
  expandedGroups,
  setExpandedGroups,
  onDragStart,
  onDragEnd,
  onEdit,
  onView,
}: {
  itens: TarefaItem[];
  grupos: TarefaGrupoOption[];
  colunaId: string;
  dragId: string | null;
  meuId: string;
  meuRole: string;
  expandedGroups: Set<string>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onEdit: (t: TarefaItem) => void;
  onView: (t: TarefaItem) => void;
}) {
  const comGrupo: TarefaItem[] = [];
  const semGrupo: TarefaItem[] = [];
  for (const t of itens) {
    (t.grupo_id ? comGrupo : semGrupo).push(t);
  }

  const gruposPorId: Record<string, TarefaItem[]> = {};
  for (const t of comGrupo) (gruposPorId[t.grupo_id!] ??= []).push(t);
  for (const id of Object.keys(gruposPorId)) {
    gruposPorId[id].sort((a, b) => {
      const po = { urgente: 0, alta: 1, media: 2, baixa: 3 };
      const pa = po[a.prioridade] ?? 99;
      const pb = po[b.prioridade] ?? 99;
      if (pa !== pb) return pa - pb;
      return (a.prazo ?? "9999-99-99").localeCompare(b.prazo ?? "9999-99-99");
    });
  }

  const gruposMap: Record<string, TarefaGrupoOption> = {};
  for (const g of grupos) gruposMap[g.id] = g;
  const gruposOrdenados = Object.keys(gruposPorId).sort((a, b) => {
    const ga = gruposMap[a];
    const gb = gruposMap[b];
    if (!ga || !gb) return 0;
    if (ga.manual !== gb.manual) return ga.manual ? 1 : -1;
    return ga.nome.localeCompare(gb.nome);
  });

  const renderCards = (lista: TarefaItem[], baseIndex: number) =>
    lista.map((t, i) => (
      <Reveal key={t.id} delay={Math.min(baseIndex + i, 12) * 40}>
        <TarefaCard
          tarefa={t}
          meuId={meuId}
          meuRole={meuRole}
          arrastando={dragId === t.id}
          onEdit={onEdit}
          onView={onView}
          onDragStart={() => onDragStart(t.id)}
          onDragEnd={onDragEnd}
        />
      </Reveal>
    ));

  let index = 0;
  const blocosGrupo = gruposOrdenados.map((gid) => {
    const meta = gruposMap[gid];
    if (!meta) return null;
    const lista = gruposPorId[gid];
    const groupKey = `${colunaId}__grupo__${gid}`;
    const expandido = expandedGroups.has(groupKey);
    const total = lista.length;
    const visiveis = expandido ? lista : lista.slice(0, LIMITE_VISIVEL);
    const ocultos = total - visiveis.length;
    const bloco = (
      <div key={gid} className="space-y-1">
        <GrupoHeader
          grupo={meta}
          total={total}
          admin={meuRole === "admin_agencia"}
          onToggle={() => {
            const next = new Set(expandedGroups);
            if (next.has(groupKey)) next.delete(groupKey);
            else next.add(groupKey);
            setExpandedGroups(next);
          }}
        />
        {renderCards(visiveis, index)}
        {ocultos > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-slate-400 hover:text-royal-200"
            onClick={() => {
              const next = new Set(expandedGroups);
              if (next.has(groupKey)) next.delete(groupKey);
              else next.add(groupKey);
              setExpandedGroups(next);
            }}
          >
            {expandido ? `Ver menos` : `+ ${ocultos} tarefa${ocultos > 1 ? "s" : ""}`}
          </Button>
        )}
      </div>
    );
    index += lista.length;
    return bloco;
  });

  const ordenadosSemGrupo = [...semGrupo].sort(
    (a, b) =>
      (a.cliente_nome ?? "~~sem cliente").localeCompare(
        b.cliente_nome ?? "~~sem cliente"
      )
  );

  let ultimoCliente: string | null = "__init__";
  const blocoResto = ordenadosSemGrupo.map((t, i) => {
    const grp = t.cliente_nome ?? null;
    const novoGrupo = grp !== ultimoCliente;
    ultimoCliente = grp;
    return (
      <div key={t.id}>
        {novoGrupo && (
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 pt-1.5 pb-0.5 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-royal-400" />
            {grp ?? "Sem cliente"}
          </div>
        )}
        {renderCards([t], index + i)}
      </div>
    );
  });

  return (
    <>
      {blocosGrupo}
      {blocoResto}
    </>
  );
}

// ============================================================================
// FORMULÁRIO "+ NOVA COLUNA" (Trello-style)
// ============================================================================
function NovaColunaForm({
  quadroId,
  className,
}: {
  quadroId: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  const submit = useCallback(() => {
    if (!nome.trim()) {
      setError("Digite um nome.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("quadro_id", quadroId);
      fd.set("nome", nome.trim());
      const res = await criarColunaAction(undefined, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setNome("");
      setError(null);
      setAberto(false);
      // revalidatePath já recarrega a página automaticamente.
    });
  }, [nome, quadroId]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={cn(
          "w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-sm font-medium text-slate-400 hover:text-royal-200 hover:border-royal-500/40 hover:bg-royal-500/5 transition",
          className
        )}
      >
        <Plus className="h-4 w-4" /> Adicionar outra lista
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-royal-500/40 bg-bg-surface p-2 space-y-2",
        className
      )}
    >
      <Input
        ref={inputRef}
        value={nome}
        onChange={(e) => {
          setNome(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setAberto(false);
            setNome("");
            setError(null);
          }
        }}
        maxLength={40}
        placeholder="Título da lista"
        className="h-8 text-sm"
        disabled={pending}
      />
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" onClick={submit} loading={pending}>
          Adicionar
        </Button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setNome("");
            setError(null);
          }}
          className="h-8 w-8 inline-flex items-center justify-center rounded text-slate-400 hover:bg-bg-elevated"
          title="Cancelar"
          disabled={pending}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="text-[10px] text-danger-400">{error}</p>}
    </div>
  );
}

// ============================================================================
// CABEÇALHO DE GRUPO (reaproveitado do código antigo — sem mudanças de UX)
// ============================================================================
function GrupoHeader({
  grupo,
  total,
  admin,
  onToggle,
}: {
  grupo: TarefaGrupoOption;
  total: number;
  admin: boolean;
  onToggle: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renomeando, setRenomeando] = useState(false);
  const [novoNome, setNovoNome] = useState(grupo.nome);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function handleRenomear() {
    const nome = novoNome.trim();
    if (!nome || nome === grupo.nome) {
      setRenomeando(false);
      return;
    }
    const res = await renomearGrupoAction(grupo.id, nome);
    if (res?.error) {
      alert(res.error);
      return;
    }
    setRenomeando(false);
  }

  async function handleExcluir() {
    const res = await excluirGrupoAction(grupo.id);
    if (res?.error) {
      alert(res.error);
    }
  }

  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider rounded-md border border-royal-500/30 bg-royal-500/10 text-royal-200 px-2 py-1 flex items-center justify-between gap-1">
      {renomeando ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRenomear();
          }}
          className="flex items-center gap-1 flex-1"
        >
          <Input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            maxLength={80}
            className="h-6 text-[10px] flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setRenomeando(false);
                setNovoNome(grupo.nome);
              }
            }}
          />
          <button
            type="submit"
            className="h-6 w-6 inline-flex items-center justify-center rounded text-emerald-400 hover:bg-bg-elevated"
            title="Salvar"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              setRenomeando(false);
              setNovoNome(grupo.nome);
            }}
            className="h-6 w-6 inline-flex items-center justify-center rounded text-slate-400 hover:bg-bg-elevated"
            title="Cancelar"
          >
            <X className="h-3 w-3" />
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
            title="Expandir/recoltar"
          >
            <Package className="h-3 w-3 shrink-0" />
            <span className="truncate normal-case font-medium text-xs">{grupo.nome}</span>
          </button>
          <span className="text-royal-300/80">{total}</span>
          {admin && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-5 w-5 inline-flex items-center justify-center rounded text-royal-300 hover:text-royal-100 hover:bg-royal-500/20"
                title="Ações do agrupamento"
                aria-label="Ações do agrupamento"
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 w-40 rounded-lg border border-border bg-bg-elevated shadow-xl py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setRenomeando(true);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-bg-muted inline-flex items-center gap-2"
                  >
                    <Pencil className="h-3 w-3" /> Renomear
                  </button>
                  <ConfirmDialog
                    trigger={
                      <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        className="w-full text-left px-3 py-1.5 text-xs text-danger-400 hover:bg-bg-muted inline-flex items-center gap-2"
                      >
                        <Trash2 className="h-3 w-3" /> Excluir
                      </button>
                    }
                    title={`Excluir "${grupo.nome}"?`}
                    description={
                      <span>
                        As tarefas deste agrupamento ficarão sem grupo.
                        Esta ação não pode ser desfeita.
                      </span>
                    }
                    confirmText="Excluir"
                    variant="danger"
                    onConfirm={handleExcluir}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
