"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Link2, Copy, CheckCircle2, Mail, X } from "lucide-react";
import {
  gerarLinkAssinaturaAction,
  type GerarLinkState,
} from "@/lib/actions/contrato-actions";
import { toast } from "@/components/ui/Toast";

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md bg-royal-500 hover:bg-royal-600 text-white disabled:opacity-50 transition"
    >
      <Link2 className="h-4 w-4" />
      {pending ? "Gerando..." : "Gerar link para o cliente assinar"}
    </button>
  );
}

export function GerarLinkAssinaturaButton({ contratoId }: { contratoId: string }) {
  const [state, action] = useFormState<GerarLinkState, FormData>(
    gerarLinkAssinaturaAction,
    undefined
  );
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Quando o link é gerado com sucesso, abre o modal e dispara um toast efêmero.
  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      setShowModal(true);
      toast.success("Link de assinatura gerado!");
    }
  }, [state]);

  function copiar(texto: string) {
    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const success = state && "ok" in state && state.ok ? state : null;

  return (
    <>
      {/* Form sempre visível no header — compacto. */}
      <form action={action} className="space-y-2">
        <input type="hidden" name="contrato_id" value={contratoId} />
        {state && "error" in state && state.error && (
          <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2 max-w-xl">
            {state.error}
          </p>
        )}
        <SubmitButton />
      </form>

      {/* Modal overlay com o link gerado — não destrói o layout do header. */}
      {showModal && success && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card max-w-lg w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Link gerado! Envie para{" "}
                <strong className="text-slate-100">{success.nome}</strong>.
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-bg-elevated"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Ao abrir o link, o cliente vê o contrato, digita o nome e desenha a assinatura
              digital, que é registrada no contrato com IP, hash e timestamp.
              <strong className="text-slate-300"> Expira em {success.expiraEm}.</strong>
            </p>

            <div className="rounded-md bg-bg-elevated border border-border p-3 mt-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                Link único de assinatura
              </p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs text-slate-200 break-all flex-1">{success.link}</code>
                <button
                  type="button"
                  onClick={() => copiar(success.link)}
                  className="p-1.5 rounded hover:bg-bg-surface text-slate-400 shrink-0"
                  title="Copiar link"
                >
                  {copied ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <a
                href={`mailto:?subject=${encodeURIComponent("Contrato para assinatura")}&body=${encodeURIComponent(success.link)}`}
                className="inline-flex items-center gap-1.5 text-xs text-royal-300 hover:text-royal-200"
              >
                <Mail className="h-3.5 w-3.5" /> Enviar por e-mail
              </a>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-sm px-3 py-1.5 rounded-md bg-bg-elevated hover:bg-bg-surface text-slate-200 border border-border"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}