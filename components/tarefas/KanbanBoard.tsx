"use client";

import { useMemo, useState, useTransition, useEffect, useRef, useCallback } from "react";
import {
  Plus, Filter, Package, MoreHorizontal, Pencil, Trash2, X, Check,
  ArrowUp, ArrowDown, Layers, GripHorizontal, Palette, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { moverTarefaAction, criarTarefaRapidoAction } from "@/lib/actions/tarefa-actions";
import { renomearGrupoAction, excluirGrupoAction } from "@/lib/actions/grupo-actions";
import {
  criarColunaAction,
  renomearColunaAction,
  excluirColunaAction,
  moverColunaAction,
  definirCorColunaAction,
  moverColunaEntreAction,
} from "@/lib/actions/coluna-actions";
import { Reveal } from "@/components/ui/motion/Reveal";
import { TarefaCard } from "./TarefaCard";
import { TarefaDialog } from "./TarefaDialog";
import { TarefaDetailDialog } from "./TarefaDetailDialog";
import { MoverQuadroDialog } from "./MoverQuadroDialog";
import type { ClienteOption, MembroOption, TarefaGrupoOption, TarefaItem } from "@/app/admin/tarefas/page";
import type { TarefaColuna, TarefaQuadro } from "@/types/database";

const LIMITE_VISIVEL = 9;
const CORES_COLUNA = [
  "#64748b", // slate (default)
  "#ef4444", // vermelho
  "#f59e0b", // âmbar
  "#22c55e", // verde
  "#06b6d4", // ciano
  "#3b82f6", // azul
  "#8b5cf6", // violeta
  "#ec4899", // rosa
];

export function KanbanBoard({
  tarefas,
  membros,
  clientes,
  quadros,
  grupos,
  colunas,
  colunasPorQuadro,
  labels,
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
  /** Para MoverQuadroDialog: mapa de quadroId → colunas disponíveis. */
  colunasPorQuadro: Record<string, { id: string; nome: string }[]>;
  /** Catálogo de labels da agência (pro filtro). */
  labels: { id: string; nome: string; cor: string }[];
  quadroAtivoId: string;
  meuId: string;
  meuRole: string;
}) {
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [clienteId, setClienteId] = useState<string>("");
  const [labelFiltroIds, setLabelFiltroIds] = useState<string[]>([]);
  const [minhas, setMinhas] = useState(false);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [colunaInicialDialog, setColunaInicialDialog] = useState<string | null>(null);
  const [editando, setEditando] = useState<TarefaItem | null>(null);
  const [visualizando, setVisualizando] = useState<TarefaItem | null>(null);
  const [moverQuadroTarefaId, setMoverQuadroTarefaId] = useState<string | null>(null);

  // Estados de drag
  const [dragTarefaId, setDragTarefaId] = useState<string | null>(null);
  const [dragColunaId, setDragColunaId] = useState<string | null>(null);
  const [dropTargetColunaId, setDropTargetColunaId] = useState<string | null>(null);
  // Posição de drop dentro da coluna (id da tarefa ANTES da qual vamos inserir)
  const [dropPosAntesDeTarefaId, setDropPosAntesDeTarefaId] = useState<string | null>(null);
  const [dropPosEmptyColunaId, setDropPosEmptyColunaId] = useState<string | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (!mostrarArquivadas && t.arquivado) return false;
      if (minhas && !t.responsaveis.some((r) => r.id === meuId)) return false;
      if (responsavelId && !t.responsaveis.some((r) => r.id === responsavelId)) return false;
      if (clienteId && t.cliente_id !== clienteId) return false;
      if (labelFiltroIds.length > 0) {
        const ids = new Set(t.labels.map((l) => l.id));
        // exige TODOS os labels do filtro (AND)
        if (!labelFiltroIds.every((id) => ids.has(id))) return false;
      }
      return true;
    });
  }, [tarefas, mostrarArquivadas, minhas, responsavelId, clienteId, meuId, labelFiltroIds]);

  const porColuna = useMemo(() => {
    const map: Record<string, TarefaItem[]> = {};
    for (const c of colunas) map[c.id] = [];
    for (const t of filtradas) {
      (map[t.tarefa_coluna_id] ??= []).push(t);
    }
    // Ordena por `ordem` (drag manda dentro da coluna)
    for (const id of Object.keys(map)) {
      map[id].sort((a, b) => a.ordem - b.ordem);
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

  // ===========================================================================
  // DRAG DE CARDS — drop numa coluna, na posição (antes de qual tarefa)
  // ===========================================================================
  function onCardDragStart(tarefaId: string) {
    setDragTarefaId(tarefaId);
    setDragColunaId(null);
  }
  function onCardDragEnd() {
    setDragTarefaId(null);
    setDropTargetColunaId(null);
    setDropPosAntesDeTarefaId(null);
    setDropPosEmptyColunaId(null);
  }

  function onColunaDragOverColuna(colunaId: string, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragColunaId) {
      // arrastando coluna — só destaca destino
      setDropTargetColunaId(colunaId);
      return;
    }
    if (dragTarefaId) {
      setDropTargetColunaId(colunaId);
      // Se a coluna está vazia, drop = final
      const itens = porColuna[colunaId] ?? [];
      if (itens.length === 0 || (itens.length === 1 && itens[0]!.id === dragTarefaId)) {
        setDropPosEmptyColunaId(colunaId);
        setDropPosAntesDeTarefaId(null);
      } else {
        setDropPosEmptyColunaId(null);
        // detecta posição baseado no Y do cursor vs centro do card alvo
        const tgt = e.currentTarget as HTMLElement;
        const cards = Array.from(
          tgt.querySelectorAll<HTMLElement>("[data-tarefa-id]")
        ).filter((el) => el.dataset.tarefaId !== dragTarefaId);
        if (cards.length === 0) {
          setDropPosAntesDeTarefaId(null);
          return;
        }
        const y = e.clientY;
        let antesDe: string | null = null;
        for (const cardEl of cards) {
          const r = cardEl.getBoundingClientRect();
          if (y < r.top + r.height / 2) {
            antesDe = cardEl.dataset.tarefaId ?? null;
            break;
          }
        }
        setDropPosAntesDeTarefaId(antesDe);
      }
    }
  }

  function onColunaDrop(colunaId: string) {
    const dt = dragTarefaId;
    const dc = dragColunaId;
    setDragTarefaId(null);
    setDragColunaId(null);
    setDropTargetColunaId(null);
    setDropPosAntesDeTarefaId(null);
    setDropPosEmptyColunaId(null);

    if (dc) {
      // arrastando coluna → reordenar pela barra
      const colunaIdArrastada = dc;
      // coluna vizinha antes da qual vamos inserir (mesmo id = cancela)
      if (colunaIdArrastada === colunaId) return;
      // Pra reordenar, achar a coluna vizinha ALVO (a coluna SOLTADA):
      // vamos inserir colunaArrastada ANTES da coluna alvo.
      // A action vai cuidar do resto.
      startTransition(async () => {
        await moverColunaEntreAction(colunaIdArrastada, colunaId);
      });
      return;
    }

    if (dt) {
      const antesDe = dropPosAntesDeTarefaId;
      startTransition(async () => {
        await moverTarefaAction(dt, colunaId, antesDe);
      });
    }
  }

  function onColunaDragLeave(colunaId: string) {
    if (dropTargetColunaId === colunaId) {
      // só limpa se saiu pra fora mesmo (não pra outro filho)
      // pequeno timeout pra permitir dragover entrar em filho
      // mas como o target é o wrapper da coluna, qualquer leave interno
      // não dispara aqui. Logo, é seguro limpar.
      setDropTargetColunaId(null);
      setDropPosAntesDeTarefaId(null);
      setDropPosEmptyColunaId(null);
    }
  }

  // ===========================================================================
  // DRAG DE COLUNA (pela barra do header)
  // ===========================================================================
  function onColunaDragStartHeader(colunaId: string, e: React.DragEvent) {
    setDragColunaId(colunaId);
    setDragTarefaId(null);
    // imagem custom: header transparente (pra mostrar o card atrás)
    e.dataTransfer.setData("text/plain", `coluna:${colunaId}`);
    e.dataTransfer.effectAllowed = "move";
  }
  function onColunaDragEndHeader() {
    setDragColunaId(null);
    setDropTargetColunaId(null);
  }

  const filtroAtivo =
    responsavelId || clienteId || minhas || labelFiltroIds.length > 0;
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

        {labels.length > 0 && (
          <div className="space-y-1.5 min-w-[200px] flex-1">
            <label className="label flex items-center gap-1">
              <Tag className="h-3 w-3" /> Etiquetas
            </label>
            <div className="flex flex-wrap items-center gap-1 min-h-[36px] rounded-md border border-border bg-bg-elevated px-2 py-1">
              {labels.map((l) => {
                const ativo = labelFiltroIds.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() =>
                      setLabelFiltroIds((cur) =>
                        ativo ? cur.filter((x) => x !== l.id) : [...cur, l.id]
                      )
                    }
                    title={l.nome}
                    className={cn(
                      "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium border border-black/10 transition",
                      ativo ? "ring-2 ring-offset-1 ring-offset-bg-surface ring-white/40" : "opacity-60 hover:opacity-100"
                    )}
                    style={{ backgroundColor: l.cor }}
                  >
                    {l.nome}
                  </button>
                );
              })}
              {labelFiltroIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLabelFiltroIds([])}
                  className="ml-auto text-[10px] text-slate-400 hover:text-royal-200 inline-flex items-center gap-1"
                  title="Limpar"
                >
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>
          </div>
        )}

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
                dragTarefaId={dragTarefaId}
                dragColunaId={dragColunaId}
                dropTargetColunaId={dropTargetColunaId}
                dropPosAntesDeTarefaId={dropPosAntesDeTarefaId}
                dropPosEmptyColunaId={dropPosEmptyColunaId}
                podeCriar={podeCriar}
                podeEditar={podeCriar}
                expandedGroups={expandedGroups}
                setExpandedGroups={setExpandedGroups}
                meuId={meuId}
                meuRole={meuRole}
                onColunaDragOver={onColunaDragOverColuna}
                onColunaDragLeave={onColunaDragLeave}
                onColunaDrop={onColunaDrop}
                onCardDragStart={onCardDragStart}
                onCardDragEnd={onCardDragEnd}
                onColunaDragStartHeader={onColunaDragStartHeader}
                onColunaDragEndHeader={onColunaDragEndHeader}
                onAddTarefa={() => abrirCriar(col.id)}
                onEdit={abrirEditar}
                onView={abrirVer}
                onMoverQuadro={(id) => setMoverQuadroTarefaId(id)}
              />
            );
          })}

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
        labels={labels}
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
        onMoverQuadro={(id) => setMoverQuadroTarefaId(id)}
      />

      {moverQuadroTarefaId && (
        <MoverQuadroDialog
          tarefaId={moverQuadroTarefaId}
          quadros={quadros}
          colunasPorQuadro={colunasPorQuadro}
          quadroAtualId={quadroAtivoId}
          onClose={() => setMoverQuadroTarefaId(null)}
          onMoved={() => {
            setMoverQuadroTarefaId(null);
            setVisualizando(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// COLUNA
// ============================================================================
function Coluna({
  coluna,
  totalColunas,
  itens,
  grupos,
  dragTarefaId,
  dragColunaId,
  dropTargetColunaId,
  dropPosAntesDeTarefaId,
  dropPosEmptyColunaId,
  podeCriar,
  podeEditar,
  expandedGroups,
  setExpandedGroups,
  meuId,
  meuRole,
  onColunaDragOver,
  onColunaDragLeave,
  onColunaDrop,
  onCardDragStart,
  onCardDragEnd,
  onColunaDragStartHeader,
  onColunaDragEndHeader,
  onAddTarefa,
  onEdit,
  onView,
  onMoverQuadro,
}: {
  coluna: TarefaColuna;
  totalColunas: number;
  itens: TarefaItem[];
  grupos: TarefaGrupoOption[];
  quadroId: string;
  dragTarefaId: string | null;
  dragColunaId: string | null;
  dropTargetColunaId: string | null;
  dropPosAntesDeTarefaId: string | null;
  dropPosEmptyColunaId: string | null;
  podeCriar: boolean;
  podeEditar: boolean;
  expandedGroups: Set<string>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  meuId: string;
  meuRole: string;
  onColunaDragOver: (colunaId: string, e: React.DragEvent) => void;
  onColunaDragLeave: (colunaId: string) => void;
  onColunaDrop: (colunaId: string) => void;
  onCardDragStart: (id: string) => void;
  onCardDragEnd: () => void;
  onColunaDragStartHeader: (id: string, e: React.DragEvent) => void;
  onColunaDragEndHeader: () => void;
  onAddTarefa: () => void;
  onEdit: (t: TarefaItem) => void;
  onView: (t: TarefaItem) => void;
  onMoverQuadro: (id: string) => void;
}) {
  const isDropTarget = dropTargetColunaId === coluna.id;
  const dropVazio =
    isDropTarget && dropPosEmptyColunaId === coluna.id && dragTarefaId;

  return (
    <div
      onDragOver={(e) => onColunaDragOver(coluna.id, e)}
      onDragLeave={() => onColunaDragLeave(coluna.id)}
      onDrop={() => onColunaDrop(coluna.id)}
      className={cn(
        "shrink-0 w-[280px] flex flex-col bg-bg-surface/60 rounded-xl border border-border max-h-[calc(100vh-220px)] transition-colors",
        isDropTarget && dragTarefaId && "ring-2 ring-royal-500/50 bg-royal-500/5",
        isDropTarget && dragColunaId && "ring-2 ring-amber-500/50 bg-amber-500/5"
      )}
    >
      <ColunaHeader
        coluna={coluna}
        total={itens.length}
        podeEditar={podeEditar}
        totalColunas={totalColunas}
        arrastando={dragColunaId === coluna.id}
        onDragStartHeader={(e) => onColunaDragStartHeader(coluna.id, e)}
        onDragEndHeader={onColunaDragEndHeader}
      />
      <div className="flex-1 overflow-y-auto p-2 space-y-2 relative">
        {itens.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-6 italic">Vazio</p>
        )}
        {dropVazio && (
          <div className="absolute inset-x-2 top-2 h-1 bg-royal-400 rounded-full pointer-events-none" />
        )}
        <CardsLista
          itens={itens}
          grupos={grupos}
          colunaId={coluna.id}
          dragTarefaId={dragTarefaId}
          dropPosAntesDeTarefaId={dropPosAntesDeTarefaId}
          meuId={meuId}
          meuRole={meuRole}
          expandedGroups={expandedGroups}
          setExpandedGroups={setExpandedGroups}
          onCardDragStart={onCardDragStart}
          onCardDragEnd={onCardDragEnd}
          onEdit={onEdit}
          onView={onView}
          onMoverQuadro={onMoverQuadro}
        />
      </div>
      {podeCriar && (
        <div className="p-2 border-t border-border">
          <InlineAddTarefa colunaId={coluna.id} onAbrirModal={() => onAddTarefa()} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CABEÇALHO DA COLUNA
// ============================================================================
function ColunaHeader({
  coluna,
  total,
  podeEditar,
  totalColunas,
  arrastando,
  onDragStartHeader,
  onDragEndHeader,
}: {
  coluna: TarefaColuna;
  total: number;
  podeEditar: boolean;
  totalColunas: number;
  arrastando: boolean;
  onDragStartHeader: (e: React.DragEvent) => void;
  onDragEndHeader: () => void;
}) {
  const [renomeando, setRenomeando] = useState(false);
  const [novoNome, setNovoNome] = useState(coluna.nome);
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const colorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen && !colorOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (colorRef.current?.contains(t)) return;
      setMenuOpen(false);
      setColorOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen, colorOpen]);

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

  function setCor(cor: string | null) {
    startTransition(async () => {
      await definirCorColunaAction(coluna.id, cor);
      setColorOpen(false);
      setMenuOpen(false);
    });
  }

  // Cor da coluna (default slate-700 se null)
  const cor = coluna.cor || null;
  const estiloHeader = cor
    ? {
        backgroundColor: `${cor}1A`, // ~10% alpha
        borderBottomColor: `${cor}66`,
      }
    : undefined;

  return (
    <div
      draggable={podeEditar}
      onDragStart={podeEditar ? onDragStartHeader : undefined}
      onDragEnd={podeEditar ? onDragEndHeader : undefined}
      style={estiloHeader}
      className={cn(
        "flex items-center justify-between gap-1 px-2.5 py-2 border-b border-border",
        podeEditar && "cursor-grab active:cursor-grabbing",
        arrastando && "opacity-50"
      )}
      title={podeEditar ? "Arraste pra reordenar colunas" : undefined}
    >
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
          {podeEditar && (
            <GripHorizontal className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden />
          )}
          {cor && (
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: cor }}
              aria-hidden
            />
          )}
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
                  <div className="relative" ref={colorRef}>
                    <button
                      type="button"
                      onClick={() => setColorOpen((v) => !v)}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-bg-muted inline-flex items-center gap-2"
                    >
                      <Palette className="h-3.5 w-3.5" /> Cor
                    </button>
                    {colorOpen && (
                      <div className="absolute right-full top-0 mr-1 z-40 rounded-lg border border-border bg-bg-elevated shadow-xl p-2 w-44">
                        <p className="text-[10px] text-slate-500 mb-1.5 px-1">
                          Cor da capa
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCor(null)}
                            className={cn(
                              "h-6 w-6 rounded-full border-2 border-dashed border-slate-500 hover:scale-110 transition",
                              !cor && "ring-2 ring-offset-1 ring-offset-bg-elevated ring-white/60"
                            )}
                            title="Sem cor"
                          />
                          {CORES_COLUNA.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setCor(c)}
                              title={c}
                              className={cn(
                                "h-6 w-6 rounded-full border-2 transition hover:scale-110",
                                cor === c
                                  ? "border-white ring-2 ring-offset-1 ring-offset-bg-elevated ring-white/40"
                                  : "border-transparent"
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {coluna.ordem > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMover("cima")}
                      disabled={pending}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-bg-muted inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <ArrowUp className="h-3.5 w-3.5" /> Mover pra cima
                    </button>
                  )}
                  {coluna.ordem < totalColunas - 1 && (
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
// LISTA DE CARDS
// ============================================================================
function CardsLista({
  itens,
  grupos,
  colunaId,
  dragTarefaId,
  dropPosAntesDeTarefaId,
  meuId,
  meuRole,
  expandedGroups,
  setExpandedGroups,
  onCardDragStart,
  onCardDragEnd,
  onEdit,
  onView,
  onMoverQuadro,
}: {
  itens: TarefaItem[];
  grupos: TarefaGrupoOption[];
  colunaId: string;
  dragTarefaId: string | null;
  dropPosAntesDeTarefaId: string | null;
  meuId: string;
  meuRole: string;
  expandedGroups: Set<string>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  onCardDragStart: (id: string) => void;
  onCardDragEnd: () => void;
  onEdit: (t: TarefaItem) => void;
  onView: (t: TarefaItem) => void;
  onMoverQuadro: (id: string) => void;
}) {
  const comGrupo: TarefaItem[] = [];
  const semGrupo: TarefaItem[] = [];
  for (const t of itens) {
    (t.grupo_id ? comGrupo : semGrupo).push(t);
  }

  // Drag manda dentro do bloco — mas como já vem ordenado por `ordem` da
  // page, basta preservar essa ordem.
  const gruposPorId: Record<string, TarefaItem[]> = {};
  for (const t of comGrupo) (gruposPorId[t.grupo_id!] ??= []).push(t);

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
      <div key={t.id}>
        {/* Linha azul indicando ponto de inserção */}
        {dragTarefaId && dropPosAntesDeTarefaId === t.id && (
          <div className="h-1 my-1 rounded-full bg-royal-400" />
        )}
        <Reveal delay={Math.min(baseIndex + i, 12) * 40}>
          <TarefaCard
            tarefa={t}
            meuId={meuId}
            meuRole={meuRole}
            arrastando={dragTarefaId === t.id}
            onEdit={onEdit}
            onView={onView}
            onMoverQuadro={onMoverQuadro}
            onDragStart={() => onCardDragStart(t.id)}
            onDragEnd={onCardDragEnd}
          />
        </Reveal>
      </div>
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

  const ordenadosSemGrupo = [...semGrupo].sort((a, b) =>
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

  // Marcador no fim da lista (para dropPosAntesDeTarefaId === null)
  const dropNoFim =
    dragTarefaId && dropPosAntesDeTarefaId === null && itens.length > 0;

  return (
    <>
      {blocosGrupo}
      {blocoResto}
      {dropNoFim && (
        <div className="h-1 rounded-full bg-royal-400" />
      )}
    </>
  );
}

// ============================================================================
// FORMULÁRIO INLINE "+ ADICIONAR TAREFA"
// ============================================================================
function InlineAddTarefa({
  colunaId,
  onAbrirModal,
}: {
  colunaId: string;
  onAbrirModal: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  function submit() {
    const t = titulo.trim();
    if (!t) return;
    startTransition(async () => {
      const res = await criarTarefaRapidoAction({ titulo: t, colunaId });
      if (res?.error) {
        alert(res.error);
        return;
      }
      setTitulo("");
      inputRef.current?.focus();
    });
  }

  if (!aberto) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-royal-200 hover:bg-bg-elevated transition"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar tarefa
        </button>
        <button
          type="button"
          onClick={onAbrirModal}
          className="h-8 w-8 inline-flex items-center justify-center rounded text-slate-500 hover:text-royal-200 hover:bg-bg-elevated"
          title="Abrir formulário completo"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-royal-500/40 bg-bg-elevated p-2 space-y-1.5">
      <Input
        ref={inputRef}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && titulo.trim()) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setAberto(false);
            setTitulo("");
          }
        }}
        placeholder="Título da tarefa"
        maxLength={140}
        className="h-8 text-sm"
        disabled={pending}
      />
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          onClick={submit}
          loading={pending}
          disabled={!titulo.trim()}
        >
          Adicionar
        </Button>
        <button
          type="button"
          onClick={onAbrirModal}
          className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:text-royal-200 hover:bg-bg-muted"
          title="Formulário completo"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setTitulo("");
          }}
          className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:bg-bg-muted"
          title="Cancelar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// FORMULÁRIO "+ NOVA COLUNA"
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
// CABEÇALHO DE GRUPO
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