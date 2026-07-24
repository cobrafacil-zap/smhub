"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, X, Save, Trash2 } from "lucide-react";
import { atualizarTransacaoAction, excluirTodasParcelasAction } from "@/lib/actions/agencia-actions";
import { Button } from "@/components/ui/Button";
import { BRLInput } from "@/components/ui/BRLInput";
import { toast } from "@/components/ui/Toast";
import type { TransacaoNatureza, TransacaoStatus, TransacaoTipo } from "@/types/database";

/**
 * Botão "Editar" de um lançamento financeiro — abre um dialog com o
 * formulário preenchido. Usa a server action atualizarTransacaoAction
 * (Partial), que respeita RLS pela agencia_id do usuário logado.
 *
 * Quando o lançamento é uma parcela de um grupo, o título do dialog
 * mostra "Editar parcela X/N" e aparece um botão extra "Excluir todas
 * as parcelas" (só na pai, parcela 1/N), que chama
 * `excluirTodasParcelasAction` e deleta a pai (cascade apaga as filhas).
 */
export function EditarTransacaoButton({
  id,
  tipo,
  status,
  dataVencimento,
  valor,
  descricao,
  categoria,
  natureza,
  parcelaAtual,
  parcelaTotal,
}: {
  id: string;
  tipo: TransacaoTipo;
  status: TransacaoStatus;
  dataVencimento: string;
  valor: number;
  descricao: string;
  categoria: string;
  natureza: TransacaoNatureza | null;
  parcelaAtual: number | null;
  parcelaTotal: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingAll, setRemovingAll] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  const isParcela = !!parcelaTotal && !!parcelaAtual;
  const isPai = isParcela && parcelaAtual === 1;

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    try {
      const res = await atualizarTransacaoAction(id, formData);
      if (res && "error" in res && res.error) {
        setError(res.error);
        setSaving(false);
      } else {
        setSaving(false);
        setOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setSaving(false);
    }
  }

  async function handleExcluirTodas() {
    if (!confirm(`Excluir todas as ${parcelaTotal} parcelas? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setRemovingAll(true);
    try {
      const res = await excluirTodasParcelasAction(id);
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        setRemovingAll(false);
      } else {
        const count = "count" in res && typeof res.count === "number" ? res.count : 0;
        toast.success(
          count > 0
            ? `${count + 1} parcelas excluídas.`
            : "Parcelas excluídas."
        );
        setRemovingAll(false);
        setOpen(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado.");
      setRemovingAll(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Editar lançamento"
        className="inline-flex items-center justify-center text-slate-300 hover:text-royal-300 hover:bg-bg-elevated p-1.5 rounded-md transition"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        className="bg-bg-surface border border-border rounded-lg p-0 backdrop:bg-black/60 max-w-lg w-full"
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                {isParcela ? `Editar parcela ${parcelaAtual}/${parcelaTotal}` : "Editar lançamento"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {descricao}
                {isParcela && !isPai && (
                  <span className="block mt-0.5 text-amber-400/80">
                    Parcela de um grupo. Pra alterar o grupo inteiro, edite a parcela 1/{parcelaTotal}.
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form action={handleSubmit} className="space-y-3">
            {error && (
              <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Tipo</label>
                <select name="tipo" className="input" defaultValue={tipo} required>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select name="status" className="input" defaultValue={status} required>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="label">Data</label>
                <input
                  name="data_vencimento"
                  type="date"
                  className="input"
                  defaultValue={dataVencimento}
                  required
                />
              </div>
              <div>
                <label className="label">Valor (R$)</label>
                <BRLInput name="valor" defaultValue={Number(valor) || 0} required />
              </div>
              <div className="col-span-2">
                <label className="label">Descrição</label>
                <input name="descricao" className="input" defaultValue={descricao} required />
              </div>
              <div className="col-span-2">
                <label className="label">Categoria</label>
                <input name="categoria" className="input" defaultValue={categoria} required />
              </div>
              <div className="col-span-2">
                <label className="label">Natureza</label>
                <select name="natureza" className="input" defaultValue={natureza ?? "variavel"} required>
                  <option value="variavel">Variável — muda mês a mês</option>
                  <option value="fixa">Fixa — recorrente/estável</option>
                </select>
              </div>
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
              {isPai ? (
                <Button
                  type="button"
                  variant="ghost"
                  loading={removingAll}
                  onClick={handleExcluirTodas}
                  iconLeft={<Trash2 className="h-4 w-4" />}
                  className="text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
                >
                  Excluir todas as parcelas
                </Button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm rounded-md text-slate-300 hover:bg-bg-elevated"
                >
                  Cancelar
                </button>
                <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" />}>
                  Salvar
                </Button>
              </div>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}