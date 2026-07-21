"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, Save, Trash2, Plus, Video } from "lucide-react";
import { EditorialCalendar, type CalendarEntry } from "@/components/calendar/EditorialCalendar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { MONTHS_PT } from "@/lib/constants";
import {
  criarGravacaoAction,
  atualizarGravacaoAction,
  deletarGravacaoAction,
} from "@/lib/actions/gravacao-actions";
import type { Gravacao, GravacaoStatus } from "@/types/database";

export type GravacaoItem = Gravacao & { cliente_nome?: string | null };
export type ClienteOption = { id: string; nome_empresa: string };

const STATUS_OPCOES: { value: GravacaoStatus; label: string }[] = [
  { value: "agendada", label: "Agendada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

const STATUS_CHIP: Record<GravacaoStatus, string> = {
  agendada: "bg-amber-500/20 text-amber-700 dark:text-amber-200 border-amber-500/30",
  confirmada: "bg-royal-500/20 text-royal-700 dark:text-royal-200 border-royal-500/30",
  concluida: "bg-success-500/20 text-success-600 dark:text-success-400 border-success-500/30",
  cancelada: "bg-danger-500/20 text-danger-600 dark:text-danger-400 border-danger-500/30",
};

const STATUS_LABEL: Record<GravacaoStatus, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function adicionarMes(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  gravacoes: GravacaoItem[];
  clientes: ClienteOption[];
  mesAtivo: string; // YYYY-MM
  basePath: string; // "/cliente/gravacoes" | "/admin/gravacoes"
  modoCliente: boolean; // true = cliente (esconde seletor de cliente)
}

export function GravacoesCalendarClient({
  gravacoes,
  clientes,
  mesAtivo,
  basePath,
  modoCliente,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<GravacaoItem | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Map gravacoes → CalendarEntry (tipo = status p/ cor; estilo = hora).
  const entries: CalendarEntry[] = gravacoes.map((g) => ({
    id: g.id,
    data: g.data,
    titulo: g.titulo,
    tipo: g.status,
    estilo: g.hora ? g.hora.slice(0, 5) : null,
  }));

  const [y, m] = mesAtivo.split("-").map(Number);
  const monthLabel = `${MONTHS_PT[m - 1]} ${y}`;
  const initialDate = `${mesAtivo}-01`;

  function abrirNovo(date: string) {
    setEditing(null);
    setPrefillDate(date);
    setDialogOpen(true);
  }
  function abrirEditar(entry: CalendarEntry) {
    const g = gravacoes.find((x) => x.id === entry.id) ?? null;
    if (!g) return;
    setEditing(g);
    setPrefillDate(null);
    setDialogOpen(true);
  }

  function navegar(delta: number) {
    router.push(`${basePath}?mes=${adicionarMes(mesAtivo, delta)}`, { scroll: false });
  }
  function irHoje() {
    router.push(`${basePath}?mes=${mesAtual()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-lg font-semibold text-slate-100 capitalize flex items-center gap-2">
          <Video className="h-5 w-5 text-royal-300" />
          {monthLabel}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button size="sm" variant="secondary" onClick={() => navegar(-1)} iconLeft={<ChevronLeft className="h-4 w-4" />}>
            Anterior
          </Button>
          <Button size="sm" variant="secondary" onClick={irHoje}>
            Hoje
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navegar(1)} iconRight={<ChevronRight className="h-4 w-4" />}>
            Próximo
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const d = new Date();
              abrirNovo(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
            }}
            iconLeft={<Plus className="h-4 w-4" />}
          >
            Nova gravação
          </Button>
        </div>
      </Card>

      {gravacoes.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Video className="h-10 w-10 mx-auto text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma gravação em {monthLabel}</p>
            <p className="text-xs text-slate-500 mt-1">
              Clique em um dia do calendário para agendar uma gravação.
            </p>
          </div>
        </Card>
      ) : null}

      <EditorialCalendar
        entries={entries}
        initialDate={initialDate}
        onCellClick={abrirNovo}
        onEntryClick={abrirEditar}
        renderChip={(e) => ({
          label: e.titulo,
          chip: STATUS_CHIP[e.tipo as GravacaoStatus] ?? STATUS_CHIP.agendada,
        })}
      />

      <Card>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Legenda</p>
        <ul className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          {STATUS_OPCOES.map((o) => (
            <li key={o.value} className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full border", STATUS_CHIP[o.value])} />
              {o.label}
            </li>
          ))}
        </ul>
      </Card>

      {dialogOpen && (
        <GravacaoDialog
          key={editing?.id ?? `new-${prefillDate}`}
          gravacao={editing}
          prefillDate={prefillDate}
          clientes={clientes}
          modoCliente={modoCliente}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog de criar/editar gravação (native <dialog>, padrão do TarefaDialog).
// ---------------------------------------------------------------------------
function GravacaoDialog({
  gravacao,
  prefillDate,
  clientes,
  modoCliente,
  onClose,
  onSaved,
}: {
  gravacao: GravacaoItem | null;
  prefillDate: string | null;
  clientes: ClienteOption[];
  modoCliente: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const editing = !!gravacao;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function handleClose() {
    if (!pending) onClose();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = editing
        ? await atualizarGravacaoAction(gravacao!.id, formData)
        : await criarGravacaoAction(undefined, formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        onSaved();
      }
    });
  }

  async function handleDelete() {
    if (!gravacao) return;
    startTransition(async () => {
      const res = await deletarGravacaoAction(gravacao.id);
      if (res && res.error) {
        setError(res.error);
      } else {
        onSaved();
      }
    });
  }

  return (
    <dialog
      ref={ref}
      onClose={handleClose}
      className="backdrop:bg-black/60 rounded-xl p-0 w-full max-w-lg text-slate-100 bg-bg-surface border border-border shadow-xl"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            {editing ? "Editar gravação" : "Nova gravação"}
          </h2>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="label">Título</label>
          <Input name="titulo" required defaultValue={gravacao?.titulo ?? ""} placeholder="Ex.: Gravação de reels institucional" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Data</label>
            <Input
              type="date"
              name="data"
              required
              defaultValue={gravacao?.data ?? prefillDate ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Hora</label>
            <Input type="time" name="hora" defaultValue={gravacao?.hora ?? ""} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Status</label>
            <Select name="status" defaultValue={gravacao?.status ?? "agendada"}>
              {STATUS_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="label">Local</label>
            <Input name="local" defaultValue={gravacao?.local ?? ""} placeholder="Ex.: Estúdio / cliente" />
          </div>
        </div>

        {!modoCliente && (
          <div className="space-y-1.5">
            <label className="label">Cliente</label>
            <Select name="cliente_id" defaultValue={gravacao?.cliente_id ?? ""} required>
              <option value="">— Selecione —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_empresa}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="label">Descrição</label>
          <Textarea name="descricao" defaultValue={gravacao?.descricao ?? ""} placeholder="Detalhes da gravação, briefing, equipamentos…" className="min-h-[80px]" />
        </div>

        {error && (
          <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          {editing ? (
            <ConfirmDialog
              trigger={
                <span className="inline-flex items-center gap-1 text-sm text-danger-400 hover:text-danger-300">
                  <Trash2 className="h-4 w-4" /> Excluir
                </span>
              }
              title="Excluir gravação"
              description={`Excluir "${gravacao?.titulo}"? Esta ação não pode ser desfeita.`}
              confirmText="Excluir"
              variant="danger"
              onConfirm={handleDelete}
            />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending} iconLeft={!pending ? <Save className="h-4 w-4" /> : undefined}>
              {pending ? "Salvando…" : editing ? "Salvar" : "Criar gravação"}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}