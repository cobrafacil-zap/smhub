"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { criarTarefaAction, atualizarTarefaAction } from "@/lib/actions/tarefa-actions";
import type { ClienteOption, MembroOption, TarefaItem } from "@/app/admin/tarefas/page";

const STATUS_OPCOES = [
  { value: "destinada", label: "Tarefa destinada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "pronta", label: "Pronta" },
  { value: "entregue", label: "Entregue" },
];

const PRIORIDADE_OPCOES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export function TarefaDialog({
  open,
  tarefa,
  membros,
  clientes,
  onClose,
}: {
  open: boolean;
  tarefa: TarefaItem | null; // null = criação
  membros: MembroOption[];
  clientes: ClienteOption[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = !!tarefa;

  useEffect(() => {
    if (open) {
      setError(null);
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [open]);

  function handleClose() {
    if (!pending) onClose();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = editing
        ? await atualizarTarefaAction(tarefa!.id, formData)
        : await criarTarefaAction(undefined, formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <dialog
      ref={ref}
      onClose={handleClose}
      className={cn(
        "backdrop:bg-black/60 rounded-xl p-0 w-full max-w-lg text-slate-100",
        "bg-bg-surface border border-border shadow-xl"
      )}
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            {editing ? "Editar tarefa" : "Nova tarefa"}
          </h2>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="label">Título</label>
          <Input
            name="titulo"
            required
            defaultValue={tarefa?.titulo ?? ""}
            placeholder="Ex.: Criar 3 reels do cliente X"
          />
        </div>

        <div className="space-y-1.5">
          <label className="label">Descrição</label>
          <Textarea
            name="descricao"
            defaultValue={tarefa?.descricao ?? ""}
            placeholder="Detalhes, escopo, referências…"
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Status</label>
            <Select name="status" defaultValue={tarefa?.status ?? "destinada"}>
              {STATUS_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="label">Prioridade</label>
            <Select name="prioridade" defaultValue={tarefa?.prioridade ?? "media"}>
              {PRIORIDADE_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Prazo</label>
            <Input type="date" name="prazo" defaultValue={tarefa?.prazo ?? ""} />
          </div>
          <div className="space-y-1.5">
            <label className="label">Cliente (opcional)</label>
            <Select name="cliente_id" defaultValue={tarefa?.cliente_id ?? ""}>
              <option value="">— Nenhum —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_empresa}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Multi-atribuição */}
        <div className="space-y-1.5">
          <label className="label">Responsáveis</label>
          <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 rounded-lg bg-bg-elevated border border-border">
            {membros.length === 0 && (
              <p className="col-span-2 text-xs text-slate-500 py-2 text-center">
                Nenhum membro ativo. Convide a equipe primeiro.
              </p>
            )}
            {membros.map((m) => {
              const checked = tarefa?.responsaveis.some((r) => r.id === m.id) ?? false;
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-slate-100"
                >
                  <input
                    type="checkbox"
                    name="responsaveis"
                    value={m.id}
                    defaultChecked={checked}
                    className="h-4 w-4 rounded border-border accent-royal-500"
                  />
                  <span className="truncate">
                    {m.nome}
                    {m.cargo ? <span className="text-slate-500"> · {m.cargo}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" loading={pending} iconLeft={!pending ? <Save className="h-4 w-4" /> : undefined}>
            {pending ? "Salvando…" : editing ? "Salvar" : "Criar tarefa"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}