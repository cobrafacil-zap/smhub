"use client";

import { useState, useTransition } from "react";
import { Check, Pause, X, Loader2 } from "lucide-react";
import { atualizarClienteStatusAction } from "@/lib/actions/cliente-convite-actions";
import type { ClienteStatus } from "@/types/database";
import { toast } from "@/components/ui/Toast";

export function ClienteStatusButtons({
  clienteId,
  currentStatus,
  compact = false,
}: {
  clienteId: string;
  currentStatus: ClienteStatus;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<ClienteStatus>(currentStatus);

  function trocar(status: ClienteStatus) {
    if (status === optimistic) return;
    setOptimistic(status);
    startTransition(async () => {
      const res = await atualizarClienteStatusAction(clienteId, status);
      if (res?.error) {
        setOptimistic(currentStatus);
        toast.error(res.error);
      } else {
        const label =
          status === "ativo" ? "ativado" : status === "pausado" ? "pausado" : "inativado";
        toast.success(`Cliente ${label}.`);
      }
    });
  }

  const sizeClass = compact ? "h-7 w-7" : "h-8 w-8";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="inline-flex items-center gap-1">
      {pending && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      <button
        type="button"
        title="Ativar cliente"
        disabled={pending || optimistic === "ativo"}
        onClick={() => trocar("ativo")}
        className={`${sizeClass} inline-flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Check className={iconSize} />
      </button>
      <button
        type="button"
        title="Pausar cliente"
        disabled={pending || optimistic === "pausado"}
        onClick={() => trocar("pausado")}
        className={`${sizeClass} inline-flex items-center justify-center rounded-md border border-warning-500/30 bg-warning-500/10 text-warning-300 hover:bg-warning-500/20 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Pause className={iconSize} />
      </button>
      <button
        type="button"
        title="Inativar cliente"
        disabled={pending || optimistic === "inativo"}
        onClick={() => trocar("inativo")}
        className={`${sizeClass} inline-flex items-center justify-center rounded-md border border-slate-500/30 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <X className={iconSize} />
      </button>
    </div>
  );
}
