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
 * Bloco estrutural (condicional):
 *  - FILHA (parcela_atual > 1): nada, edição é individual.
 *  - PAI (parcela_atual = 1): checkbox "propagar valor" + input
 *    "Nº de parcelas" (aumentar adiciona filhas; diminuir apaga
 *    filhas pendentes do final; pagas bloqueiam a redução).
 *  - SIMPLES (sem parcela_total): checkbox "Parcelar este lançamento"
 *    + input "Nº de parcelas" (2..60). Marcar transforma a transação
 *    na pai de um novo grupo.
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

  // Estado estrutural (3 casos). Para PAI: propagar valor (default true)
  // + novo total (default = parcelaTotal atual). Para SIMPLES: checkbox
  // "parcelar" (default false) + nº de parcelas (default 2).
  const [propagarValor, setPropagarValor] = useState(true);
  const [novoTotal, setNovoTotal] = useState<number | null>(parcelaTotal);
  const [parcelarSimples, setParcelarSimples] = useState(false);
  const [parcelasSimples, setParcelasSimples] = useState(2);

  const ref = useRef<HTMLDialogElement>(null);

  // Reseta estado local + abre/fecha o <dialog> nativo quando `open`
  // muda. O showModal/close fica aqui (não no onClick) pra cobrir
  // também o caso de fechar via ESC / clique no backdrop.
  useEffect(() => {
    if (open) {
      setError(null);
      setPropagarValor(true);
      setNovoTotal(parcelaTotal);
      setParcelarSimples(false);
      setParcelasSimples(2);
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [open, parcelaTotal]);

  const isParcela = !!parcelaTotal && !!parcelaAtual;
  const isPai = isParcela && parcelaAtual === 1;
  const isFilha = isParcela && parcelaAtual !== 1;
  const isSimples = !parcelaTotal;

  // ---- Cálculos para feedback do bloco estrutural ----
  // PAI: diferença entre novo total e atual (positiva = estende,
  // negativa = diminui). Limitada a >= 2 no input.
  const filhasNovas =
    isPai && novoTotal != null && parcelaTotal != null
      ? Math.max(0, novoTotal - parcelaTotal)
      : 0;
  const filhasRemovidas =
    isPai && novoTotal != null && parcelaTotal != null && novoTotal >= 2
      ? Math.max(0, parcelaTotal - novoTotal)
      : 0;
  const novoTotalInvalido =
    isPai && novoTotal != null && novoTotal < 2;

  // SIMPLES: se o usuário marcou o checkbox, conta as filhas que
  // nasceriam (N-1 — a própria transação vira a 1/N).
  const filhasSimplesNovas =
    isSimples && parcelarSimples && parcelasSimples >= 2
      ? parcelasSimples - 1
      : 0;

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    try {
      // Anexa parcelas_total no formData conforme o caso:
      // - PAI: usa novoTotal do estado (controlado).
      // - SIMPLES + parcelar: usa parcelasSimples.
      // - SIMPLES sem parcelar: omite o campo (action não faz nada
      //   com ele).
      // - FILHA: action ignora de qualquer jeito.
      if (isPai && novoTotal != null) {
        formData.set("parcelas_total", String(novoTotal));
      } else if (isSimples && parcelarSimples && parcelasSimples >= 2) {
        formData.set("parcelas_total", String(parcelasSimples));
      }

      const res = await atualizarTransacaoAction(id, formData);
      if (res && "error" in res && res.error) {
        setError(res.error);
        setSaving(false);
      } else {
        const count = "count" in res && typeof res.count === "number" ? res.count : 0;
        if (count > 0) {
          if (isSimples) {
            toast.success(
              `Transformado em parcelado: ${parcelasSimples} parcelas geradas.`
            );
          } else if (filhasNovas > 0) {
            toast.success(
              `${filhasNovas} nova${filhasNovas > 1 ? "s" : ""} parcela${filhasNovas > 1 ? "s" : ""} adicionada${filhasNovas > 1 ? "s" : ""}.`
            );
          } else if (filhasRemovidas > 0) {
            toast.success(
              `${filhasRemovidas} parcela${filhasRemovidas > 1 ? "s" : ""} removida${filhasRemovidas > 1 ? "s" : ""}.`
            );
          } else {
            toast.success(
              `${count} parcela${count > 1 ? "s" : ""} atualizada${count > 1 ? "s" : ""}.`
            );
          }
        }
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
                {isPai
                  ? `Editar parcela inicial 1/${parcelaTotal}`
                  : isFilha
                  ? `Editar parcela ${parcelaAtual}/${parcelaTotal}`
                  : "Editar lançamento"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {descricao}
                {isFilha && (
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

            {/* ----------------------------------------------------------------
                BLOCO ESTRUTURAL — aparece em PAI e SIMPLES. Em FILHA é omitido.
                Condições:
                  - isSimples: checkbox "Parcelar este lançamento" + Nº.
                  - isPai:    checkbox "propagar valor" + Nº (2..60).
            ---------------------------------------------------------------- */}
            {(isPai || isSimples) && (
              <div className="rounded-lg border border-royal-500/30 bg-royal-500/[0.05] p-3 space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-royal-300">
                  {isPai
                    ? `Grupo de parcelas (${parcelaTotal} no total)`
                    : "Transformar em parcelado"}
                </p>

                {/* ---- SIMPLES: checkbox "parcelar" ---- */}
                {isSimples && (
                  <label className="flex items-start gap-2 cursor-pointer text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={parcelarSimples}
                      onChange={(e) => setParcelarSimples(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-border accent-royal-500"
                    />
                    <span>
                      Parcelar este lançamento
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Gera parcelas mensais a partir da data de vencimento.
                        Cada parcela pode ser marcada paga individualmente.
                      </span>
                    </span>
                  </label>
                )}

                {/* ---- PAI: propagar valor ---- */}
                {isPai && (
                  <label className="flex items-start gap-2 cursor-pointer text-sm text-slate-200">
                    <input
                      type="checkbox"
                      name="propagar_valor"
                      value="1"
                      checked={propagarValor}
                      onChange={(e) => setPropagarValor(e.target.checked)}
                      className="h-4 w-4 mt-0.5 rounded border-border accent-royal-500"
                    />
                    <span>
                      Aplicar valor e descrição a todas as parcelas pendentes
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Parcelas já <strong className="text-slate-300">pagas</strong> mantêm
                        o valor original (audit trail do que já foi contabilizado).
                      </span>
                    </span>
                  </label>
                )}

                {/* ---- Input "Nº de parcelas" (sempre, condicional à UI de cada caso) ---- */}
                {((isPai) || (isSimples && parcelarSimples)) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-royal-500/20">
                    <label className="text-xs text-slate-300">Nº de parcelas:</label>
                    <input
                      name="parcelas_total"
                      type="number"
                      min={2}
                      max={60}
                      value={
                        isPai
                          ? novoTotal ?? parcelaTotal ?? 1
                          : parcelasSimples
                      }
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (isPai) {
                          setNovoTotal(Number.isFinite(n) ? n : parcelaTotal);
                        } else {
                          setParcelasSimples(Number.isFinite(n) && n >= 2 ? n : 2);
                        }
                      }}
                      className="input h-8 w-20 text-sm !py-0"
                      required
                    />
                    <span className="text-[11px] text-slate-500">
                      {isPai ? (
                        <>
                          Atual: {parcelaTotal}. Aumentar adiciona parcelas novas após a
                          última data. Diminuir remove parcelas pendentes do final
                          (pagas bloqueiam a redução).
                        </>
                      ) : (
                        <>
                          Cada parcela mensal após a data de vencimento atual.
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* ---- Feedback: SIMPLES transformando ---- */}
                {isSimples && filhasSimplesNovas > 0 && (
                  <p className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1.5">
                    Serão geradas <strong>+{filhasSimplesNovas} parcela{filhasSimplesNovas > 1 ? "s" : ""}</strong>{" "}
                    pendente{filhasSimplesNovas > 1 ? "s" : ""} a partir da data de vencimento.
                    Esta transação vira a parcela 1/{parcelasSimples}.
                  </p>
                )}

                {/* ---- Feedback: PAI estendendo ---- */}
                {isPai && filhasNovas > 0 && (
                  <p className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1.5">
                    Serão geradas <strong>+{filhasNovas} parcela{filhasNovas > 1 ? "s" : ""}</strong>{" "}
                    pendente{filhasNovas > 1 ? "s" : ""} a partir da última data.
                  </p>
                )}

                {/* ---- Feedback: PAI diminuindo ---- */}
                {isPai && filhasRemovidas > 0 && (
                  <p className="text-[11px] text-danger-300 bg-danger-500/10 border border-danger-500/30 rounded px-2 py-1.5">
                    Serão removidas <strong>{filhasRemovidas} parcela{filhasRemovidas > 1 ? "s" : ""}</strong>{" "}
                    pendente{filhasRemovidas > 1 ? "s" : ""} do final. A parcela_total
                    do grupo cai pra {novoTotal}. Parcelas pagas bloqueiam a redução.
                  </p>
                )}

                {/* ---- Validação: Nº < 2 na PAI ---- */}
                {novoTotalInvalido && (
                  <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1.5">
                    Nº de parcelas deve ser pelo menos 2.
                  </p>
                )}
              </div>
            )}

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
