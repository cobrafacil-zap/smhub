"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BRLInput } from "@/components/ui/BRLInput";
import { ArrowLeft, AlertCircle } from "lucide-react";
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
      {pending ? "Convidando..." : "Convidar"}
    </Button>
  );
}

type State = { error?: string; ok?: true } | undefined;

export default function NovoEquipePage() {
  const [state, formAction] = useFormState<State, FormData>(criarEquipeAction, undefined);

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Convidar membro"
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/equipe", label: "Equipe" },
          { label: "Novo" },
        ]}
        actions={
          <Link href="/admin/equipe">
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />}>Voltar</Button>
          </Link>
        }
      />

      <Card>
        <p className="text-sm text-slate-400 mb-4">
          O membro será cadastrado e poderá fazer login com a senha padrão
          <code className="mx-1 px-1 bg-bg-elevated rounded">smhub123</code>
          (ele deverá trocar a senha no primeiro acesso).
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
              Será contabilizado no financeiro (DRE / custos fixos). Pode editar depois.
            </p>
          </div>
          <div>
            <label className="label">Permissão *</label>
            <select name="role" className="input" defaultValue="membro_equipe" required>
              <option value="membro_equipe">Membro da equipe</option>
              <option value="admin_agencia">Administrador (acesso total)</option>
            </select>
          </div>
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Link href="/admin/equipe">
              <Button type="button" variant="ghost">Cancelar</Button>
            </Link>
            <SubmitButton />
          </div>
        </form>
      </Card>
    </div>
  );
}
