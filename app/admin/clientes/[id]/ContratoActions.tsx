"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deletarContratoAction } from "@/lib/actions/contrato-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function ContratoActions({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex items-center gap-2">
      {error && <span className="text-[10px] text-danger-300 max-w-[120px]">{error}</span>}
      <ConfirmDialog
        title="Excluir contrato?"
        description="Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
        trigger={
          <button
            type="button"
            className="p-1.5 rounded text-danger-300 hover:text-danger-200 hover:bg-danger-500/10"
            title="Excluir contrato"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        }
        onConfirm={async () => {
          try {
            await deletarContratoAction(id);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Erro ao excluir.";
            if (!msg.includes("NEXT_REDIRECT")) setError(msg);
            throw e;
          }
        }}
      />
    </div>
  );
}