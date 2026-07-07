"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Plus, Save, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { criarFaturaAction } from "@/lib/actions/fatura-briefing-actions";

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daqui30(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function FaturaForm({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const [dataEmissao, setDataEmissao] = useState(hojeISO());
  const [dataVencimento, setDataVencimento] = useState(daqui30());
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    const fd = new FormData();
    fd.set("cliente_id", clienteId);
    fd.set("data_emissao", dataEmissao);
    fd.set("data_vencimento", dataVencimento);
    fd.set("valor", valor);
    if (descricao) fd.set("descricao", descricao);
    startTransition(async () => {
      const res = await criarFaturaAction(fd);
      if (res && "error" in res && res.error) setError(res.error);
      else {
        setOpen(false);
        setValor("");
        setDescricao("");
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
          <div className="h-8 w-8 rounded-md bg-royal-500/20 flex items-center justify-center">
            <FileText className="h-4 w-4 text-royal-300" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-100">Nova fatura avulsa</p>
            <p className="text-xs text-slate-500">Crie uma cobrança única para este cliente.</p>
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Emissão</label>
              <input
                type="date"
                className="input text-sm"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label text-xs">Vencimento</label>
              <input
                type="date"
                className="input text-sm"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input text-sm"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>
          <div>
            <label className="label text-xs">Descrição (opcional)</label>
            <input
              className="input text-sm"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Serviço extra, bônus..."
            />
          </div>

          {error && (
            <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={pending} iconLeft={<Save className="h-4 w-4" />}>
              Criar fatura
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
