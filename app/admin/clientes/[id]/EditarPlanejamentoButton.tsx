"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Pencil, X, Save } from "lucide-react";
import { atualizarPlanejamentoAction } from "@/lib/actions/agencia-actions";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Planejamento, PlanejamentoStatus } from "@/types/database";

const STATUS_OPCOES: { value: PlanejamentoStatus; label: string }[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "aprovado", label: "Aprovado" },
  { value: "em_execucao", label: "Em execução" },
  { value: "concluido", label: "Concluído" },
];

export function EditarPlanejamentoButton({ plan }: { plan: Planejamento }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await atualizarPlanejamentoAction(plan.id, formData);
      if (res && "error" in res && res.error) {
        setError(res.error);
      } else {
        toast.success("Planejamento atualizado!");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-royal-300 px-2 py-1 rounded hover:bg-bg-elevated transition"
        title="Editar planejamento"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        className="bg-bg-surface border border-border rounded-lg p-0 backdrop:bg-black/60 max-w-lg w-full"
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Editar planejamento</h3>
              <p className="text-xs text-slate-400 mt-1">
                Objetivo geral, observações e status do mês.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form action={handleSubmit} className="space-y-3">
            {error && (
              <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div>
              <label className="label">Objetivo geral</label>
              <Textarea
                name="objetivo_geral"
                defaultValue={plan.objetivo_geral ?? ""}
                rows={3}
                placeholder="Ex.: Aumentar engajamento, lançar novo produto..."
              />
            </div>
            <div>
              <label className="label">Observações</label>
              <Textarea
                name="observacoes"
                defaultValue={plan.observacoes ?? ""}
                rows={3}
                placeholder="Anotações internas da equipe..."
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                name="status"
                defaultValue={plan.status}
                className="input"
              >
                {STATUS_OPCOES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-sm rounded-md text-slate-300 hover:bg-bg-elevated"
              >
                Cancelar
              </button>
              <Button type="submit" loading={pending} iconLeft={<Save className="h-4 w-4" />}>
                Salvar
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}