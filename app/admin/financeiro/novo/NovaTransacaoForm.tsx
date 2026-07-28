"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Save } from "lucide-react";
import { criarTransacaoAction } from "@/lib/actions/agencia-actions";
import { toast } from "@/components/ui/Toast";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} iconLeft={<Save className="h-4 w-4" />}>
      Salvar lançamento
    </Button>
  );
}

export function NovaTransacaoForm() {
  const router = useRouter();
  const [state, action] = useFormState(criarTransacaoAction, undefined);
  const [parcelado, setParcelado] = useState(false);

  // Sucesso: toast + volta para o financeiro.
  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      const count = "count" in state && typeof state.count === "number" ? state.count : 1;
      if (count > 1) {
        toast.success(`${count} parcelas criadas!`);
      } else {
        toast.success("Lançamento criado!");
      }
      router.push("/admin/financeiro");
      router.refresh();
    }
  }, [state, router]);

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <form action={action} className="space-y-4">
        {state && "error" in state && state.error && (
          <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo *</label>
            <select name="tipo" className="input" required defaultValue="despesa">
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
          <div>
            <label className="label">Status *</label>
            <select name="status" className="input" required defaultValue="pendente">
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Marcar como <strong className="text-slate-200">Pago</strong> faz a receita entrar
              no KPI &ldquo;Receita do mês&rdquo; do dashboard imediatamente.
            </p>
          </div>
          <div>
            <label className="label">Data *</label>
            <input name="data_vencimento" type="date" className="input" required defaultValue={hoje} />
          </div>
          <div>
            <label className="label">Valor (R$) *</label>
            <input name="valor" type="number" step="0.01" min="0" className="input" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descrição *</label>
            <input name="descricao" className="input" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Categoria *</label>
            <input
              name="categoria"
              className="input"
              required
              placeholder="Ex: Facebook Ads, Salário, Mensalidade cliente..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Natureza *</label>
            <select name="natureza" className="input" required defaultValue="variavel">
              <option value="variavel">Variável — muda mês a mês (ex: anúncios, material)</option>
              <option value="fixa">Fixa — recorrente/estável (ex: aluguel, salário, mensalidade)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Ajuda a separar custos previsíveis dos variáveis nos relatórios.
            </p>
          </div>
          <div className="sm:col-span-2 space-y-1.5 rounded-lg border border-border bg-bg-elevated/40 p-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-royal-500"
                checked={parcelado}
                onChange={(e) => setParcelado(e.target.checked)}
              />
              É parcelado (gerar N lançamentos mensais)
            </label>
            {parcelado && (
              <div className="flex flex-wrap items-center gap-2 pl-6 pt-1">
                <label className="text-xs text-slate-400">Nº de parcelas:</label>
                <input
                  name="parcelas_total"
                  type="number"
                  min="2"
                  max="60"
                  defaultValue="2"
                  className="input h-8 w-20 text-sm !py-0"
                  required
                />
                <span className="text-[11px] text-slate-500">
                  Cada parcela vence mensalmente a partir da data acima. Status inicial: <strong className="text-slate-200">pendente</strong>.
                </span>
              </div>
            )}
            {!parcelado && <input type="hidden" name="parcelas_total" value="1" />}
          </div>
        </div>
        <div className="pt-3 border-t border-border flex justify-end gap-2">
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}