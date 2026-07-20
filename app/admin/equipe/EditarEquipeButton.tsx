"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, X, Save } from "lucide-react";
import { atualizarEquipeAction } from "@/lib/actions/agencia-actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BRLInput } from "@/components/ui/BRLInput";

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

export function EditarEquipeButton({
  id,
  nome,
  cargo,
  custoMensal,
  role,
}: {
  id: string;
  nome: string;
  cargo: string | null;
  custoMensal: number | null;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    try {
      const res = await atualizarEquipeAction(id, formData);
      if (res && "error" in res && res.error) {
        setError(res.error);
        setSaving(false);
      } else {
        setSaving(false);
        setOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-royal-300 px-2 py-1 rounded hover:bg-bg-elevated transition"
        title="Editar membro"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        className="bg-bg-surface border border-border rounded-lg p-0 backdrop:bg-black/60 max-w-md w-full"
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Editar membro</h3>
              <p className="text-xs text-slate-400 mt-1">{nome}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form action={handleSubmit} className="space-y-3">
            {error && (
              <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div>
              <label className="label">Nome</label>
              <Input name="nome" defaultValue={nome} required />
            </div>
            <div>
              <label className="label">Função / Cargo</label>
              <select name="cargo" defaultValue={cargo ?? ""} className="input">
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
              <BRLInput name="custo_mensal" defaultValue={custoMensal ?? 0} />
              <p className="text-[10px] text-slate-500 mt-1">
                É somado às despesas do mês no Financeiro (folha fixa da equipe).
              </p>
            </div>
            <div>
              <label className="label">Papel</label>
              <select name="role" defaultValue={role} className="input">
                <option value="admin_agencia">Admin da agência</option>
                <option value="membro_equipe">Membro da equipe</option>
              </select>
            </div>
            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-sm rounded-md text-slate-300 hover:bg-bg-elevated"
              >
                Cancelar
              </button>
              <Button
                type="submit"
                loading={saving}
                iconLeft={<Save className="h-4 w-4" />}
              >
                Salvar
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
