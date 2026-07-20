"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Save, CheckCircle2, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  criarAgenciaAction,
  type CriarAgenciaState,
} from "@/lib/actions/super-admin-actions";
import { toast } from "@/components/ui/Toast";

export function CriarAgenciaForm() {
  const [state, action] = useFormState<CriarAgenciaState, FormData>(
    criarAgenciaAction,
    undefined
  );
  const { pending } = useFormStatus();

  return (
    <form action={action} className="space-y-6">
      {state && !state.ok && state.error && (
        <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {state && state.ok && (
        <Card className="!border-emerald-500/30 !bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-2 min-w-0">
              <p className="text-sm font-semibold text-emerald-300">
                Agência criada com sucesso!
              </p>
              <p className="text-xs text-slate-300">
                Repasse as credenciais abaixo ao admin da agência. A senha é
                temporária — ele já pode entrar direto.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <CredCampo label="E-mail" valor={state.email} />
                <CredCampo label="Senha temporária" valor={state.senha} />
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Agência: {state.agencia} · Admin: {state.admin}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Dados da agência</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nome fantasia *</label>
            <input name="nome_fantasia" className="input" required minLength={2} />
          </div>
          <div>
            <label className="label">Razão social</label>
            <input name="razao_social" className="input" />
          </div>
          <div>
            <label className="label">CNPJ</label>
            <input name="cnpj" className="input" placeholder="00.000.000/0000-00" />
          </div>
          <div>
            <label className="label">E-mail de contato *</label>
            <input name="email_contato" type="email" className="input" required />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input name="telefone" className="input" />
          </div>
          <div>
            <label className="label">Plano</label>
            <Select name="plano" defaultValue="pro">
              <option value="basico">Básico</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Admin da agência
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Será criado o usuário administrador desta agência com uma senha
          temporária. Ele já fica com acesso ao painel (+ trial de 7 dias).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nome do admin *</label>
            <input name="admin_nome" className="input" required minLength={2} />
          </div>
          <div>
            <label className="label">E-mail do admin *</label>
            <input name="admin_email" type="email" className="input" required />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={pending} iconLeft={<Save className="h-4 w-4" />}>
          Criar agência
        </Button>
      </div>
    </form>
  );
}

function CredCampo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-md bg-bg-elevated border border-border px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code className="text-sm text-slate-100 truncate flex-1">{valor}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(valor);
            toast.success("Copiado!");
          }}
          className="p-1 rounded text-slate-500 hover:text-royal-300 hover:bg-royal-500/10 transition"
          title="Copiar"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}