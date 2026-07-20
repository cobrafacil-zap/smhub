"use client";

import { useTransition } from "react";
import { ENTRY_STATUS } from "@/lib/constants";
import { atualizarEntradaStatusAction } from "@/lib/actions/agencia-actions";
import { toast } from "@/components/ui/Toast";
import type { EntradaStatus } from "@/types/database";

const variants: Record<EntradaStatus, string> = {
  pendente: "bg-warning-500/15 text-warning-300 border-warning-500/30",
  aprovado: "bg-info-500/15 text-info-300 border-info-500/30",
  publicado: "bg-success-500/15 text-success-300 border-success-500/30",
  rejeitado: "bg-danger-500/15 text-danger-300 border-danger-500/30",
  alteracao_solicitada: "bg-warning-500/15 text-warning-300 border-warning-500/30",
};

export function EntradaStatusSelect({
  id,
  status,
}: {
  id: string;
  status: EntradaStatus;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(novo: EntradaStatus) {
    if (novo === status) return;
    startTransition(async () => {
      try {
        await atualizarEntradaStatusAction(id, novo);
        toast.success(`Status: ${ENTRY_STATUS[novo].label}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao atualizar status.";
        if (!msg.includes("NEXT_REDIRECT")) toast.error(msg);
      }
    });
  }

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as EntradaStatus)}
      className={`text-[10px] uppercase font-semibold px-2 py-1 rounded border ${variants[status]} bg-transparent cursor-pointer hover:opacity-80 disabled:opacity-50`}
    >
      {Object.entries(ENTRY_STATUS).map(([k, v]) => (
        <option key={k} value={k} className="bg-bg-surface text-slate-200">
          {v.label}
        </option>
      ))}
    </select>
  );
}
