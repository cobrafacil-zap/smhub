"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Mail, Copy, CheckCircle2, RefreshCw, KeyRound } from "lucide-react";
import { convidarClienteAction, type ConvidarClienteState } from "@/lib/actions/cliente-convite-actions";

function SubmitButton({ jaConvidado }: { jaConvidado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      loading={pending}
      iconLeft={jaConvidado ? <RefreshCw className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
    >
      {pending
        ? "Gerando link..."
        : jaConvidado
          ? "Gerar novo link de acesso"
          : "Gerar link de acesso"}
    </Button>
  );
}

export function ConvidarClienteForm({
  clienteId,
  jaConvidado,
  jaTemEmail,
}: {
  clienteId: string;
  jaConvidado: boolean;
  jaTemEmail: boolean;
}) {
  const [state, action] = useFormState<ConvidarClienteState, FormData>(
    convidarClienteAction,
    undefined
  );
  const [copied, setCopied] = useState(false);

  function copiar(texto: string) {
    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Sem e-mail cadastrado — bloqueia
  if (!jaTemEmail) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Cadastre um e-mail para o cliente na aba &quot;Informações&quot; antes de gerar o link.
      </div>
    );
  }

  // Sucesso — mostra o link (sempre, mesmo se já tinha convite antes)
  if (state && "ok" in state && state.ok) {
    return (
      <div className="rounded-lg border border-royal-500/40 bg-royal-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Link gerado para <strong className="text-slate-100">{state.nome}</strong>
        </div>
        <p className="text-xs text-slate-400">
          Envie este link para o cliente (WhatsApp, e-mail). Ao clicar, ele define a própria senha.
          Expira em <strong className="text-slate-300">{state.expiraEm}</strong>.
        </p>
        <div className="rounded-md bg-bg-elevated border border-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Link único de definição de senha</p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-xs text-slate-200 break-all flex-1">{state.link}</code>
            <button
              type="button"
              onClick={() => copiar(state.link)}
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
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            E-mail cadastrado: <span className="text-slate-300">{state.email}</span>
          </p>
          {jaConvidado && (
            <form action={action}>
              <input type="hidden" name="cliente_id" value={clienteId} />
              <button
                type="submit"
                className="text-[11px] text-royal-300 hover:text-royal-200 underline"
              >
                Gerar outro link (enviar novamente)
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Estado padrão — mostra botão
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="cliente_id" value={clienteId} />

      {jaConvidado && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5" />
          Cliente já tem acesso ao portal. Você pode gerar um novo link se o anterior
          expirou ou se o cliente não recebeu.
        </div>
      )}

      {state && "error" in state && state.error && (
        <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <SubmitButton jaConvidado={jaConvidado} />
    </form>
  );
}
