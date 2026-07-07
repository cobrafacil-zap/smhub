"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { atualizarPlanoAgenciaAction, type AtualizarPlanoState } from "@/lib/actions/super-admin-actions";
import { formatBRL } from "@/lib/utils";

const PLANO_LABEL: Record<string, string> = {
  basico: "Básico",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function AgenciaPlanoSelect({
  agenciaId,
  planoAtual,
  valorAtual,
}: {
  agenciaId: string;
  planoAtual: "basico" | "pro" | "enterprise";
  valorAtual: number;
}) {
  const [state, action] = useFormState<AtualizarPlanoState, FormData>(
    atualizarPlanoAgenciaAction,
    undefined
  );
  const { pending } = useFormStatus();

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={agenciaId} />
      <Select
        name="plano"
        defaultValue={planoAtual}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        disabled={pending}
        className="!py-1 !text-xs"
      >
        <option value="basico">{PLANO_LABEL.basico}</option>
        <option value="pro">{PLANO_LABEL.pro}</option>
        <option value="enterprise">{PLANO_LABEL.enterprise}</option>
      </Select>
      <span className="text-[10px] text-slate-500 whitespace-nowrap">
        {formatBRL(valorAtual)}/mês
      </span>
      {state?.ok && (
        <Badge variant="success" className="!text-[10px] !py-0">✓</Badge>
      )}
    </form>
  );
}
