"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deletarBriefingAction } from "@/lib/actions/fatura-briefing-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function DeletarBriefingButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <ConfirmDialog
      title="Excluir briefing?"
      description="Esta ação não pode ser desfeita."
      confirmText="Excluir"
      variant="danger"
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-danger-300 hover:text-danger-200 px-2 py-1 rounded hover:bg-danger-500/10 transition"
          title="Excluir briefing"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {error && <span className="text-[10px]">{error}</span>}
        </button>
      }
      onConfirm={async () => {
        try {
          await deletarBriefingAction(id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erro ao excluir.";
          if (!msg.includes("NEXT_REDIRECT")) setError(msg);
          throw e;
        }
      }}
    />
  );
}