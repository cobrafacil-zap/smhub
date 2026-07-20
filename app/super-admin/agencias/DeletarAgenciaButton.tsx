"use client";

import { useState, useTransition } from "react";
import { deletarAgenciaAction } from "@/lib/actions/super-admin-actions";
import { Spinner } from "@/components/ui/Spinner";

export function DeletarAgenciaButton({
  agenciaId,
  nome,
}: {
  agenciaId: string;
  nome: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function confirmar() {
    startTransition(async () => {
      const res = await deletarAgenciaAction(agenciaId);
      if (res?.ok) {
        setOpen(false);
        setFeedback(null);
      } else {
        setFeedback(res?.error ?? "Erro ao excluir");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-md transition bg-danger-500/10 text-danger-300 hover:bg-danger-500/20"
        title="Excluir agência definitivamente"
      >
        {feedback ?? "Excluir"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div
        className="card max-w-md w-full animate-scale-in"
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-base font-semibold text-slate-100">Excluir agência</h3>
        <p className="text-sm text-slate-400 mt-2">
          Tem certeza que deseja excluir <strong className="text-slate-200">{nome}</strong>?
          Esta ação é <strong className="text-danger-300">definitiva</strong> e remove
          permanentemente:
        </p>
        <ul className="mt-2 text-xs text-slate-400 list-disc pl-5 space-y-0.5">
          <li>A conta de acesso (admin da agência)</li>
          <li>Todos os clientes, contratos, faturas e transações</li>
          <li>Planejamentos, briefings e relatórios</li>
          <li>Assinatura e histórico de cobranças</li>
          <li>Logins dos clientes (acesso ao portal)</li>
          <li>Arquivos no Storage (logos, contratos, anexos)</li>
        </ul>
        {feedback && (
          <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2 mt-3">
            {feedback}
          </p>
        )}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setFeedback(null);
            }}
            disabled={pending}
            className="text-xs px-3 py-1.5 rounded-md transition bg-bg-elevated text-slate-300 hover:bg-bg-elevated/70 border border-border"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={pending}
            className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition bg-danger-500 text-white hover:bg-danger-600 disabled:opacity-60"
          >
            {pending ? <Spinner className="h-3.5 w-3.5" /> : null}
            Excluir definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}