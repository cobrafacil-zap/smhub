"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Link2, Copy, Check, X, RefreshCw } from "lucide-react";
import { reenviarConviteEquipeAction } from "@/lib/actions/agencia-actions";
import { Button } from "@/components/ui/Button";

type Result =
  | { ok: true; link: string; expiraEm: string; nome: string; email: string }
  | { error: string };

export function ReenviarConviteButton({
  membroId,
  nome,
}: {
  membroId: string;
  nome: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (result) ref.current?.showModal();
  }, [result]);

  function gerar() {
    setCopied(false);
    startTransition(async () => {
      const res = await reenviarConviteEquipeAction(membroId);
      setResult(res as Result);
    });
  }

  async function copiar(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignora */
    }
  }

  function fechar() {
    ref.current?.close();
    setResult(null);
  }

  const link = result && "ok" in result ? result.link : null;
  const expiraEm = result && "ok" in result ? result.expiraEm : null;
  const email = result && "ok" in result ? result.email : null;
  const erro = result && "error" in result ? result.error : null;

  return (
    <>
      <button
        type="button"
        onClick={gerar}
        disabled={pending}
        title="Gerar/reenviar link de acesso"
        className="inline-flex items-center gap-1 text-xs text-royal-300 hover:text-royal-200 px-2 py-1 rounded hover:bg-bg-elevated transition disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Gerando…" : "Link de acesso"}
      </button>

      {result && (
        <dialog
          ref={ref}
          onClose={fechar}
          className="bg-bg-surface border border-border rounded-xl p-0 backdrop:bg-black/60 max-w-md w-full"
        >
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100">Link de acesso</h3>
                <p className="text-xs text-slate-400 mt-0.5">{nome}</p>
              </div>
              <button
                type="button"
                onClick={fechar}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {erro && (
              <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            {link && (
              <>
                <p className="text-sm text-slate-300">
                  Envie este link para {email ? <strong className="text-slate-100">{email}</strong> : "o membro"}.
                  Ele define (ou redefina) a própria senha. Links anteriores foram invalidados.
                </p>
                <div className="rounded-lg border border-border bg-bg-elevated p-3">
                  <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                    <Link2 className="h-3 w-3" /> Expira em {expiraEm}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-slate-200 truncate">{link}</code>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => copiar(link)}
                      iconLeft={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    >
                      {copied ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button type="button" variant="ghost" onClick={fechar}>
                    Fechar
                  </Button>
                </div>
              </>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}