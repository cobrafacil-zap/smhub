"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Save } from "lucide-react";
import { toast } from "@/components/ui/Toast";

export function DataComemorativaForm({ action }: { action: (formData: FormData) => Promise<{ error?: string } | void> }) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(formData: FormData) {
    setSaving(true);
    const res = await action(formData);
    setSaving(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Data cadastrada!");
      (document.getElementById("form-data-comemorativa") as HTMLFormElement)?.reset();
    }
  }

  return (
    <form id="form-data-comemorativa" action={onSubmit} className="space-y-3">
      <div>
        <label className="label">Nome *</label>
        <input name="nome" className="input" required />
      </div>
      <div>
        <label className="label">Data *</label>
        <input name="data" type="date" className="input" required />
      </div>
      <div>
        <label className="label">Segmento (opcional)</label>
        <input name="segmento" className="input" placeholder="Ex: Varejo" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" />}>
          Cadastrar
        </Button>
      </div>
    </form>
  );
}
