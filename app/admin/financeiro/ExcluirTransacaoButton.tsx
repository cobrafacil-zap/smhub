"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletarTransacaoAction } from "@/lib/actions/agencia-actions";

/**
 * Botão "Excluir" de um lançamento financeiro. Abre um diálogo de
 * confirmação, chama a server action e dá feedback via toast. RLS garante
 * que só exclui transações da agência do usuário logado.
 */
export function ExcluirTransacaoButton({
  id,
  descricao,
}: {
  id: string;
  descricao: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  function excluir() {
    start(async () => {
      const res = await deletarTransacaoAction(id);
      if (res && "error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Lançamento excluído.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Excluir lançamento"
        className="inline-flex items-center justify-center text-danger-300 hover:text-danger-200 hover:bg-danger-500/10 p-1.5 rounded-md transition"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        className="bg-bg-surface border border-border rounded-lg p-0 backdrop:bg-black/60 max-w-md w-full"
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-danger-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-danger-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Excluir lançamento?
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                <strong className="text-slate-200">{descricao}</strong> será
                removido do fluxo de caixa. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="px-3 py-1.5 text-sm rounded-md text-slate-300 hover:bg-bg-elevated disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={excluir}
              disabled={pending}
              className="px-3 py-1.5 text-sm rounded-md bg-danger-500 hover:bg-danger-600 text-white font-medium disabled:opacity-50"
            >
              {pending ? "Excluindo..." : "Excluir definitivamente"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}