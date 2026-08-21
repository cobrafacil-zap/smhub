"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { moverTarefaQuadroAction } from "@/lib/actions/tarefa-quadro-mover-actions";
import type { TarefaColuna, TarefaQuadro } from "@/types/database";

export function MoverQuadroDialog({
  tarefaId,
  quadros,
  colunasPorQuadro,
  quadroAtualId,
  onClose,
  onMoved,
}: {
  tarefaId: string;
  /** Todos os quadros da agência. */
  quadros: TarefaQuadro[];
  /** Mapa: quadroId → colunas desse quadro (somente as ativas). */
  colunasPorQuadro: Record<string, Pick<TarefaColuna, "id" | "nome">[]>;
  quadroAtualId: string;
  onClose: () => void;
  onMoved: () => void;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const [quadroId, setQuadroId] = useState<string>("");
  const [colunaId, setColunaId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function close() {
    ref.current?.close();
    onClose();
  }

  // Quando trocar o quadro, reset coluna pra primeira coluna do quadro novo
  function onQuadroChange(qid: string) {
    setQuadroId(qid);
    const cols = colunasPorQuadro[qid] ?? [];
    setColunaId(cols[0]?.id ?? "");
  }

  function submit() {
    if (!quadroId || !colunaId) {
      setError("Escolha o quadro e a coluna de destino.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await moverTarefaQuadroAction(tarefaId, quadroId, colunaId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onMoved();
      close();
    });
  }

  const outrosQuadros = quadros.filter((q) => q.id !== quadroAtualId);
  const colunasDoQuadro = colunasPorQuadro[quadroId] ?? [];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="rounded-xl bg-bg-surface border border-border p-0 w-full max-w-md shadow-xl backdrop:bg-black/50"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-royal-200" />
          <h2 className="text-base font-semibold text-slate-100">
            Mover para outro quadro
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          A tarefa sai do quadro atual e vai pra coluna selecionada. O grupo
          dela é removido (o destino pode não ter os mesmos grupos).
        </p>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Quadro
          </label>
          <Select
            value={quadroId}
            onChange={(e) => onQuadroChange(e.target.value)}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {outrosQuadros.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nome}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Coluna
          </label>
          {colunasDoQuadro.length === 0 ? (
            <p className="text-xs text-danger-400">
              Esse quadro não tem colunas. Crie uma antes de mover tarefas pra
              ele.
            </p>
          ) : (
            <Select
              value={colunaId}
              onChange={(e) => setColunaId(e.target.value)}
            >
              {colunasDoQuadro.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          )}
        </div>

        {error && (
          <p className="text-xs text-danger-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={close}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            loading={pending}
            disabled={
              !quadroId || !colunaId || colunasDoQuadro.length === 0
            }
          >
            Mover
          </Button>
        </div>
      </div>
    </dialog>
  );
}