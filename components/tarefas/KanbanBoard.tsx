"use client";

import { useMemo, useState } from "react";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { TarefaCard } from "./TarefaCard";
import { TarefaDialog } from "./TarefaDialog";
import type { ClienteOption, MembroOption, TarefaItem } from "@/app/admin/tarefas/page";
import type { TarefaStatus } from "@/types/database";

const COLUNAS: { status: TarefaStatus; label: string; accent: string }[] = [
  { status: "a_fazer", label: "Tarefa destinada", accent: "border-slate-500" },
  { status: "em_andamento", label: "Em andamento", accent: "border-royal-500" },
  { status: "revisao", label: "Pronta", accent: "border-amber-500" },
  { status: "concluido", label: "Entregue", accent: "border-emerald-500" },
];

export function KanbanBoard({
  tarefas,
  membros,
  clientes,
  meuId,
  meuRole,
}: {
  tarefas: TarefaItem[];
  membros: MembroOption[];
  clientes: ClienteOption[];
  meuId: string;
  meuRole: string;
}) {
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [clienteId, setClienteId] = useState<string>("");
  const [minhas, setMinhas] = useState(false);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<TarefaItem | null>(null);

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
    setDialogOpen(true);
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
                className={cn(
                  "min-w-[260px] flex-1 bg-bg-surface/50 rounded-xl border-t-2 pb-2 flex flex-col",
                  col.accent
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
                  {itens.map((t) => (
                    <TarefaCard
                      key={t.id}
                      tarefa={t}
                      meuId={meuId}
                      meuRole={meuRole}
                      onEdit={abrirEditar}
                    />
                  ))}
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
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}