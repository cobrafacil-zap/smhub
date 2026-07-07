"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Copy, CheckCircle2, ShieldPlus, Eye, EyeOff } from "lucide-react";
import { criarSuperAdminAction, type CriarSuperAdminState } from "@/lib/actions/super-admin-actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full" iconLeft={<ShieldPlus className="h-4 w-4" />}>
      Gerar acesso
    </Button>
  );
}

export function AdicionarSuperAdminForm() {
  const [state, action] = useFormState<CriarSuperAdminState, FormData>(
    criarSuperAdminAction,
    undefined
  );
  const [copied, setCopied] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  function copiar(texto: string) {
    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state?.ok) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-sm text-emerald-300 mb-3">
          <CheckCircle2 className="h-4 w-4" />
          Super admin criado
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Envie estes dados para o novo operador. A senha só aparece uma vez.
        </p>
        <div className="space-y-2">
          <div className="rounded-md bg-bg-elevated border border-border p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">E-mail</p>
            <code className="text-sm text-slate-200">{state.email}</code>
          </div>
          <div className="rounded-md bg-bg-elevated border border-border p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Senha</p>
            <div className="flex items-center justify-between">
              <code className="text-sm text-slate-200 font-mono">
                {showPwd ? state.senha : "••••••••••"}
              </code>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="p-1.5 rounded hover:bg-bg-surface text-slate-400"
                >
                  {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => copiar(state.email + "\nSenha: " + state.senha)}
                  className="p-1.5 rounded hover:bg-bg-surface text-slate-400"
                >
                  {copied ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-3">
        <ShieldPlus className="h-4 w-4 text-royal-300" />
        Adicionar super admin
      </h3>
      <form action={action} className="space-y-3">
        <div>
          <label className="label">Nome</label>
          <Input name="nome" required minLength={2} placeholder="Nome do operador" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <Input name="email" type="email" required placeholder="email@empresa.com" />
        </div>
        {state && "error" in state && state.error && (
          <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
        <SubmitBtn />
        <p className="text-[11px] text-slate-500">
          Será criada uma senha temporária que você precisa enviar ao operador.
        </p>
      </form>
    </Card>
  );
}
