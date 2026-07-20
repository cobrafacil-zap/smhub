"use client";

import { useState, useTransition } from "react";
import { Check, Trash2, Loader2 } from "lucide-react";
import {
  atualizarFaturaStatusAction,
  deletarFaturaAction,
} from "@/lib/actions/fatura-briefing-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import type { FaturaStatus } from "@/types/database";

export function FaturaActions({
  id,
  status,
}: {
  id: string;
  status: FaturaStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleMarcarPago() {
    setError(null);
    startTransition(async () => {
      const res = await atualizarFaturaStatusAction(id, "pago");
      if (res && "error" in res && res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Fatura marcada como paga.");
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-2 justify-end">
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
      {error && <span className="text-[10px] text-danger-300">{error}</span>}
      {status !== "pago" && (
        <button
          type="button"
          onClick={handleMarcarPago}
          disabled={pending}
          className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 disabled:opacity-50"
        >
          <Check className="h-3 w-3" /> Marcar paga
        </button>
      )}
      <ConfirmDialog
        title="Excluir fatura?"
        description="Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
        trigger={
          <button
            type="button"
            disabled={pending}
            className="text-xs text-danger-300 hover:text-danger-200 inline-flex items-center gap-1 disabled:opacity-50"
            title="Excluir"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        }
        onConfirm={async () => {
          try {
            await deletarFaturaAction(id);
            toast.success("Fatura excluída.");
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Erro ao excluir.";
            if (!msg.includes("NEXT_REDIRECT")) {
              setError(msg);
              toast.error(msg);
            }
            throw e;
          }
        }}
      />
    </div>
  );
}