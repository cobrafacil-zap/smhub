"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Pencil, Check, X, Building2 } from "lucide-react";
import { atualizarPlanoValorAction, type AtualizarPlanoValorState } from "@/lib/actions/super-admin-actions";
import { formatBRL } from "@/lib/utils";
import type { PlanoConfig } from "@/types/database";

const PLANO_BADGE: Record<string, { label: string; color: string }> = {
  basico: { label: "Básico", color: "default" },
  pro: { label: "Pro", color: "brand" },
  enterprise: { label: "Enterprise", color: "success" },
};

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} iconLeft={<Check className="h-4 w-4" />}>
      Salvar
    </Button>
  );
}

export function PlanoValorCard({
  plano,
  agenciasAtivas,
  receitaMensal,
}: {
  plano: PlanoConfig;
  agenciasAtivas: number;
  receitaMensal: number;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useFormState<AtualizarPlanoValorState, FormData>(
    atualizarPlanoValorAction,
    undefined
  );

  if (state?.ok) setTimeout(() => setEditing(false), 50);

  const badge = PLANO_BADGE[plano.id];

  if (!editing) {
    return (
      <Card spotlight className="lift">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{badge?.label ?? plano.nome}</p>
            <p className="text-3xl font-bold text-slate-100 mt-1">{formatBRL(plano.valor_mensal)}</p>
            <p className="text-xs text-slate-500">/mês por agência</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded hover:bg-bg-elevated text-slate-400"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        {plano.descricao && (
          <p className="text-xs text-slate-400 mb-3">{plano.descricao}</p>
        )}
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Building2 className="h-3.5 w-3.5" />
            <span>{agenciasAtivas} ativa{agenciasAtivas === 1 ? "" : "s"}</span>
          </div>
          <span className="text-emerald-400 font-medium">{formatBRL(receitaMensal)}/mês</span>
        </div>
      </Card>
    );
  }

  return (
    <Card spotlight className="lift">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={plano.id} />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 uppercase tracking-wider">{badge?.label ?? plano.nome}</p>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="p-1.5 rounded hover:bg-bg-elevated text-slate-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div>
          <label className="label">Valor mensal (R$)</label>
          <Input
            name="valor_mensal"
            type="number"
            step="0.01"
            min="0"
            defaultValue={plano.valor_mensal}
            required
          />
        </div>
        <div>
          <label className="label">Nome de exibição</label>
          <Input name="nome" defaultValue={plano.nome} />
        </div>
        <div>
          <label className="label">Descrição</label>
          <Textarea name="descricao" rows={2} defaultValue={plano.descricao ?? ""} />
        </div>
        {state?.error && (
          <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
            Salvo!
          </p>
        )}
        <SubmitBtn />
      </form>
    </Card>
  );
}
