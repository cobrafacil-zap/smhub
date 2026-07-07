"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Zap, ChevronDown, ChevronUp, Save } from "lucide-react";
import { gerarFaturaClienteAction } from "@/lib/actions/fatura-briefing-actions";

function mesAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

export function GerarMensalidadeForm({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(mesAtual());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await gerarFaturaClienteAction(clienteId, mes);
      if (res && "error" in res && res.error) setError(res.error);
      else {
        setSuccess(true);
        setOpen(false);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-amber-500/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-amber-300" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-100">Gerar mensalidade</p>
            <p className="text-xs text-slate-500">Cria a fatura do mês com base no valor mensal do cliente.</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-border space-y-3">
          <div>
            <label className="label text-xs">Mês de referência</label>
            <input
              type="month"
              className="input text-sm"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              Fatura gerada com sucesso.
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={pending} iconLeft={<Save className="h-4 w-4" />}>
              Gerar mensalidade
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
