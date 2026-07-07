"use client";

import { useTransition, useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deletarRelatorioAction } from "@/lib/actions/agencia-actions";

export function RelatorioActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    if (!confirm("Excluir este relatório? Esta ação não pode ser desfeita.")) return;
    startTransition(async () => {
      try {
        await deletarRelatorioAction(id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao excluir.";
        if (!msg.includes("NEXT_REDIRECT")) setError(msg);
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-2 shrink-0">
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
      {error && <span className="text-[10px] text-danger-300 max-w-[120px]">{error}</span>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="p-1.5 rounded text-danger-300 hover:text-danger-200 hover:bg-danger-500/10 disabled:opacity-50"
        title="Excluir relatório"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
