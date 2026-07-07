"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { excluirEquipeAction } from "@/lib/actions/cliente-convite-actions";

export function ExcluirEquipeButton({ id, nome }: { id: string; nome: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await excluirEquipeAction(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("NEXT_REDIRECT")) {
        router.push("/admin/equipe");
        return;
      }
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-danger-300 hover:text-danger-200 px-2 py-1 rounded hover:bg-danger-500/10 transition"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Excluir
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
              <h3 className="text-base font-semibold text-slate-100">Excluir membro?</h3>
              <p className="text-sm text-slate-400 mt-1">
                <strong className="text-slate-200">{nome}</strong> será removido permanentemente
                e perderá acesso à plataforma. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-md text-slate-300 hover:bg-bg-elevated disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-md bg-danger-500 hover:bg-danger-600 text-white font-medium disabled:opacity-50"
            >
              {loading ? "Excluindo..." : "Excluir definitivamente"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
