"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import { Plus, Filter, Package, MoreHorizontal, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { moverTarefaAction } from "@/lib/actions/tarefa-actions";
import { renomearGrupoAction, excluirGrupoAction } from "@/lib/actions/grupo-actions";
import { Reveal } from "@/components/ui/motion/Reveal";
import { TarefaCard } from "./TarefaCard";
import { TarefaDialog } from "./TarefaDialog";
import { TarefaDetailDialog } from "./TarefaDetailDialog";
import { faixaPrazo, ORDEM_FAIXA } from "@/lib/planejamento";
import type { ClienteOption, MembroOption, TarefaGrupoOption, TarefaItem } from "@/app/admin/tarefas/page";
import type { TarefaQuadro } from "@/types/database";
import type { TarefaStatus } from "@/types/database";

const COLUNAS: { status: TarefaStatus; label: string; accent: string }[] = [
  { status: "destinada", label: "Tarefa destinada", accent: "border-slate-500" },
  { status: "em_andamento", label: "Em andamento", accent: "border-royal-500" },
  { status: "pronta", label: "Pronta", accent: "border-amber-500" },
  { status: "entregue", label: "Entregue", accent: "border-emerald-500" },
];

export function KanbanBoard({
  tarefas,
  membros,
  clientes,
  quadros,
  grupos,
  quadroAtivoId,
  meuId,
  meuRole,
}: {
  tarefas: TarefaItem[];
  membros: MembroOption[];
  clientes: ClienteOption[];
  quadros: TarefaQuadro[];
  grupos: TarefaGrupoOption[];
  quadroAtivoId: string;
  meuId: string;
  meuRole: string;
}) {
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [clienteId, setClienteId] = useState<string>("");
  const [minhas, setMinhas] = useState(false);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [agruparPorDia, setAgruparPorDia] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<TarefaItem | null>(null);
  const [visualizando, setVisualizando] = useState<TarefaItem | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TarefaStatus | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const LIMITE_VISIVEL = 9;
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

  const porStatus = useMemo(() => {
    const map: Record<string, TarefaItem[]> = {};
    for (const t of filtradas) (map[t.status] ??= []).push(t);
    return map;
  }, [filtradas]);

  function abrirCriar() {
    setEditando(null);
    setDialogOpen(true);
  }
  function abrirEditar(t: TarefaItem) {
    setEditando(t);
    setVisualizando(null);
    setDialogOpen(true);
  }
  function abrirVer(t: TarefaItem) {
    setVisualizando(t);
  }

  // Drag-and-drop entre colunas.
  function handleDrop(novoStatus: TarefaStatus) {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    startTransition(async () => {
      await moverTarefaAction(id, novoStatus);
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

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer h-9">
          <input
            type="checkbox"
            checked={agruparPorDia}
            onChange={(e) => setAgruparPorDia(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-royal-500"
          />
          Por dia
        </label>

        {podeCriar && (
          <div className="ml-auto">
            <Button iconLeft={<Plus className="h-4 w-4" />} onClick={abrirCriar}>
              Nova tarefa
            </Button>
          </div>
        )}
      </div>

      {tarefas.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Plus className="h-10 w-10" />}
            title="Nenhuma tarefa"
            description={
              podeCriar
                ? "Crie a primeira tarefa e atribua à equipe."
                : "Quando o admin criar e atribuir tarefas, elas aparecem aqui para você acompanhar."
            }
            action={
              podeCriar ? (
                <Button iconLeft={<Plus className="h-4 w-4" />} onClick={abrirCriar}>
                  Nova tarefa
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : filtradas.length === 0 ? (
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
      ) : (
        // Quadro: 4 colunas (scroll horizontal no mobile, grid no desktop)
        <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {COLUNAS.map((col) => {
            const itens = porStatus[col.status] ?? [];
            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(col.status);
                }}
                onDragLeave={(e) => {
                  // só limpa se saiu da coluna de fato (não de um filho)
                  if (e.currentTarget === e.target) setDragOver(null);
                }}
                onDrop={() => handleDrop(col.status)}
                className={cn(
                  "min-w-[260px] flex-1 bg-bg-surface/50 rounded-xl border-t-2 pb-2 flex flex-col transition-colors",
                  col.accent,
                  dragOver === col.status && dragId && "bg-royal-500/10 ring-2 ring-royal-500/40"
                )}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-sm font-semibold text-slate-100">{col.label}</span>
                  <span className="text-[11px] text-slate-500 bg-bg-elevated rounded-full px-2 py-0.5">
                    {itens.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 flex-1">
                  {itens.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-4 italic">Vazio</p>
                  )}
                  {(() => {
                    // Densidade: com muitos cards na coluna, encolhe pra caber mais.
                    const nivel = itens.length > 10 ? "minimo" : itens.length > 5 ? "compacto" : "normal";

                    const renderCards = (lista: TarefaItem[], baseIndex: number) =>
                      lista.map((t, i) => (
                        <Reveal key={t.id} delay={Math.min(baseIndex + i, 12) * 40}>
                          <TarefaCard
                            tarefa={t}
                            meuId={meuId}
                            meuRole={meuRole}
                            nivel={nivel}
                            arrastando={dragId === t.id}
                            onEdit={abrirEditar}
                            onView={abrirVer}
                            onDragStart={() => setDragId(t.id)}
                            onDragEnd={() => setDragId(null)}
                          />
                        </Reveal>
                      ));

                    // Mapa de grupos pra lookup rápido (nome, manual).
                    const gruposMap: Record<string, TarefaGrupoOption> = {};
                    for (const g of grupos) gruposMap[g.id] = g;

                    // Tarefas COM grupo vão pro cabeçalho de grupo;
                    // tarefas SEM grupo vão pro agrupamento padrão
                    // (cliente ou faixa de prazo) como antes.
                    const comGrupo: TarefaItem[] = [];
                    const semGrupo: TarefaItem[] = [];
                    for (const t of itens) {
                      (t.grupo_id ? comGrupo : semGrupo).push(t);
                    }

                    // Agrupa as tarefas com grupo pelo grupo_id. Ordena
                    // os grupos: automáticos primeiro (alfabético), depois
                    // manuais. Dentro de cada grupo, por prioridade/prazo.
                    const gruposPorId: Record<string, TarefaItem[]> = {};
                    for (const t of comGrupo) {
                      (gruposPorId[t.grupo_id!] ??= []).push(t);
                    }
                    for (const id of Object.keys(gruposPorId)) {
                      gruposPorId[id].sort((a, b) => {
                        const po = { urgente: 0, alta: 1, media: 2, baixa: 3 };
                        const pa = po[a.prioridade] ?? 99;
                        const pb = po[b.prioridade] ?? 99;
                        if (pa !== pb) return pa - pb;
                        return (a.prazo ?? "9999-99-99").localeCompare(b.prazo ?? "9999-99-99");
                      });
                    }
                    const gruposOrdenados = Object.keys(gruposPorId).sort((a, b) => {
                      const ga = gruposMap[a];
                      const gb = gruposMap[b];
                      if (!ga || !gb) return 0;
                      // manuais depois dos automáticos
                      if (ga.manual !== gb.manual) return ga.manual ? 1 : -1;
                      return ga.nome.localeCompare(gb.nome);
                    });

                    const renderBlocoGrupo = (gid: string, baseIndex: number) => {
                      const meta = gruposMap[gid];
                      if (!meta) return null;
                      const lista = gruposPorId[gid];
                      const groupKey = `${col.status}__grupo__${gid}`;
                      const expandido = expandedGroups.has(groupKey);
                      const total = lista.length;
                      const visiveis = expandido ? lista : lista.slice(0, LIMITE_VISIVEL);
                      const ocultos = total - visiveis.length;
                      return (
                        <div key={gid} className="space-y-1">
                          <GrupoHeader
                            grupo={meta}
                            total={total}
                            admin={podeCriar}
                            onToggle={() => {
                              const next = new Set(expandedGroups);
                              if (next.has(groupKey)) next.delete(groupKey);
                              else next.add(groupKey);
                              setExpandedGroups(next);
                            }}
                          />
                          {renderCards(visiveis, baseIndex)}
                          {ocultos > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-slate-400 hover:text-slate-200"
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
                    };

                    // Renderiza blocos de grupo (no topo).
                    let index = 0;
                    const blocosGrupo = gruposOrdenados.map((gid) => {
                      const bloco = renderBlocoGrupo(gid, index);
                      if (bloco) index += (gruposPorId[gid] ?? []).length;
                      return bloco;
                    });

                    // Renderiza o resto (semGrupo) com a lógica original.
                    if (semGrupo.length === 0) return blocosGrupo;

                    let blocoResto: React.ReactNode = null;
                    if (!agruparPorDia) {
                      const ordenados = [...semGrupo].sort(
                        (a, b) =>
                          (a.cliente_nome ?? "~~sem cliente").localeCompare(
                            b.cliente_nome ?? "~~sem cliente"
                          )
                      );
                      let ultimoCliente: string | null = "__init__";
                      blocoResto = ordenados.map((t, i) => {
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
                    } else {
                      // Agrupamento por faixa de prazo.
                      const gruposPorFaixa: Record<string, TarefaItem[]> = {};
                      for (const t of semGrupo) {
                        const faixa = faixaPrazo(t.prazo);
                        (gruposPorFaixa[faixa] ??= []).push(t);
                      }
                      for (const faixa of Object.keys(gruposPorFaixa)) {
                        gruposPorFaixa[faixa].sort((a, b) => {
                          const po = { urgente: 0, alta: 1, media: 2, baixa: 3 };
                          const pa = po[a.prioridade] ?? 99;
                          const pb = po[b.prioridade] ?? 99;
                          if (pa !== pb) return pa - pb;
                          return (a.prazo ?? "9999-99-99").localeCompare(b.prazo ?? "9999-99-99");
                        });
                      }
                      blocoResto = ORDEM_FAIXA.filter((faixa) => gruposPorFaixa[faixa]?.length).map(
                        (faixa) => {
                          const lista = gruposPorFaixa[faixa];
                          const groupKey = `${col.status}__${faixa}`;
                          const expandido = expandedGroups.has(groupKey);
                          const total = lista.length;
                          const visiveis = expandido ? lista : lista.slice(0, LIMITE_VISIVEL);
                          const ocultos = total - visiveis.length;
                          const faixaColor =
                            faixa === "Atrasado"
                              ? "text-danger-400 bg-danger-500/10 border-danger-500/30"
                              : faixa === "Hoje"
                                ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                                : faixa === "Amanhã"
                                  ? "text-royal-300 bg-royal-500/10 border-royal-500/30"
                                  : "text-slate-400 bg-bg-elevated border-border";
                          return (
                            <div key={faixa} className="space-y-1">
                              <div
                                className={`text-[10px] font-semibold uppercase tracking-wider rounded-md border px-2 py-1 flex items-center justify-between ${faixaColor}`}
                              >
                                <span>{faixa}</span>
                                <span>{total}</span>
                              </div>
                              {renderCards(visiveis, index)}
                              {ocultos > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full text-xs text-slate-400 hover:text-slate-200"
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
                        }
                      );
                    }

                    return (
                      <>
                        {blocosGrupo}
                        {blocoResto}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TarefaDialog
        open={dialogOpen}
        tarefa={editando}
        membros={membros}
        clientes={clientes}
        quadros={quadros}
        grupos={grupos}
        quadroIdInicial={quadroAtivoId}
        onClose={() => setDialogOpen(false)}
      />

      <TarefaDetailDialog
        open={!!visualizando}
        tarefa={visualizando}
        podeEditar={podeCriar}
        onEdit={abrirEditar}
        onClose={() => setVisualizando(null)}
      />
    </div>
  );
}

// ============================================================================
// CABEÇALHO DE GRUPO
//
// Aparece no topo de cada bloco de tarefas agrupadas. Cor neutra (slate)
// pra não competir com as cores de faixa de prazo (que ficam abaixo dos
// sem-grupo). Inclui menu `…` com Renomear/Excluir (admin only).
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
    // revalidatePath já recarrega a página automaticamente.
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