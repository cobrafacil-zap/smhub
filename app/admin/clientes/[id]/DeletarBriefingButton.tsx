"use client";

import { useTransition, useState } from "react";
import { Trash2 } from "lucide-react";
import { deletarBriefingAction } from "@/lib/actions/fatura-briefing-actions";

export function DeletarBriefingButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    if (!confirm("Excluir este briefing? Esta ação não pode ser desfeita.")) return;
    startTransition(async () => {
      try {
        await deletarBriefingAction(id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao excluir.";
        if (!msg.includes("NEXT_REDIRECT")) setError(msg);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="inline-flex items-center gap-1 text-xs text-danger-300 hover:text-danger-200 px-2 py-1 rounded hover:bg-danger-500/10 transition disabled:opacity-50"
      title="Excluir briefing"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {error && <span className="text-[10px]">{error}</span>}
    </button>
  );
}
