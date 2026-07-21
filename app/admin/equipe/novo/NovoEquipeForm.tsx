"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BRLInput } from "@/components/ui/BRLInput";
import { AlertCircle, Copy, Check, Link2, ArrowLeft } from "lucide-react";
import { criarEquipeAction } from "@/lib/actions/agencia-actions";

const CARGOS = [
  "Designer",
  "Social Media",
  "Copywriter",
  "Gestor de Tráfego",
  "Atendimento",
  "Diretor de Arte",
  "Videomaker",
  "Analista de Dados",
  "Diretor",
  "Outro",
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {pending ? "Convidando..." : "Convidar e gerar link"}
    </Button>
  );
}

export function NovoEquipeForm({ membros }: { membros: { id: string; nome: string }[] }) {
  const [state, formAction] = useFormState(criarEquipeAction, undefined);
  const [copied, setCopied] = useState(false);

  // Sucesso: mostra o link para o admin copiar/enviar
  if (state && state.ok && state.link) {
    const link = state.link;
    const expiraEm = state.expiraEm;
    const nome = state.nome;
    const email = state.email;
    async function copiar() {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignora */
      }
    }
    return (
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Check className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Membro convidado!</h3>
            <p className="text-sm text-slate-400">
              {nome} ({email}) foi cadastrado. Envie o link abaixo para ele definir a senha.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-elevated p-3">
          <p className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
            <Link2 className="h-3 w-3" /> Link de acesso (expira em {expiraEm})
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-slate-200 truncate">{link}</code>
            <Button type="button" size="sm" variant="secondary" onClick={copiar} iconLeft={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}>
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          O membro acessa o link, define a própria senha e faz login. Você pode reenviar o link
          depois editando o membro (futuro) ou criando um novo convite.
        </p>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Link href="/admin/equipe">
            <Button variant="secondary" iconLeft={<ArrowLeft className="h-4 w-4" />}>Voltar à equipe</Button>
          </Link>
          <Link href="/admin/equipe/novo">
            <Button variant="ghost">Convidar outro</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm text-slate-400 mb-4">
        O membro será cadastrado e receberá um <strong className="text-slate-200">link de acesso</strong>
        {" "}para definir a própria senha (válido por 7 dias). Ele não precisa de senha temporária.
      </p>

      {state?.error && (
        <div className="mb-4 rounded-lg border border-danger-500/30 bg-danger-500/10 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-danger-400 mt-0.5 shrink-0" />
          <p className="text-sm text-danger-300">{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="label">Nome completo *</label>
          <input name="nome" className="input" required />
        </div>
        <div>
          <label className="label">E-mail *</label>
          <input name="email" type="email" className="input" required />
        </div>
        <div>
          <label className="label">Cargo</label>
          <select name="cargo" className="input" defaultValue="">
            <option value="">— Selecione —</option>
            {CARGOS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Custo mensal (R$)</label>
          <BRLInput name="custo_mensal" defaultValue={0} />
          <p className="text-[10px] text-slate-500 mt-1">
            É somado às despesas do mês no Financeiro (folha fixa da equipe).
            Pode editar depois. Se lançar a folha como transação, zere este
            campo do membro para não dobrar.
          </p>
        </div>
        <div>
          <label className="label">Permissão *</label>
          <select name="role" className="input" defaultValue="membro_equipe" required>
            <option value="membro_equipe">Membro da equipe</option>
            <option value="admin_agencia">Administrador (acesso total)</option>
          </select>
        </div>
        <div>
          <label className="label">Responde a (supervisor)</label>
          <select name="supervisor_id" className="input" defaultValue="">
            <option value="">— Nenhum —</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 mt-1">
            Define o organograma (quem responde a quem). Pode mudar depois em Editar.
          </p>
        </div>
        <div className="pt-3 border-t border-border flex justify-end gap-2">
          <Link href="/admin/equipe">
            <Button type="button" variant="ghost">Cancelar</Button>
          </Link>
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}