"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { forcarRenovacaoAgenciaAction } from "@/lib/actions/assinatura-actions";

export function ForcarRenovacaoButton({
  agenciaId,
  plano,
}: {
  agenciaId: string;
  plano: "basico" | "pro" | "enterprise";
}) {
  const [open, setOpen] = useState(false);
  const [dias, setDias] = useState(30);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const onClick = () => {
    const fd = new FormData();
    fd.set("agenciaId", agenciaId);
    fd.set("dias", String(dias));
    fd.set("plano", plano);
    startTransition(async () => {
      const res = await forcarRenovacaoAgenciaAction(undefined, fd);
      if (res?.ok) {
        setFeedback("✓ Renovado");
        setOpen(false);
        setTimeout(() => setFeedback(null), 2000);
      } else {
        setFeedback(res?.error ?? "Erro");
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-md transition bg-royal-500/10 text-royal-300 hover:bg-royal-500/20"
        title="Forçar renovação manual"
      >
        {feedback ?? "Renovar +30d"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={dias}
        onChange={(e) => setDias(Number(e.target.value))}
        min={1}
        max={365}
        className="w-16 px-2 py-1 text-xs rounded border border-border bg-bg-elevated text-slate-100"
      />
      <Button
        size="sm"
        onClick={onClick}
        disabled={pending}
        className="!px-2 !py-1 !text-xs"
      >
        {pending ? <Spinner className="h-3 w-3" /> : "OK"}
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-slate-500 hover:text-slate-300 px-1"
      >
        ✕
      </button>
    </div>
  );
}
