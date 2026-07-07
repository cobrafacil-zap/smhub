"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Save } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { LogoUpload } from "@/components/forms/LogoUpload";
import type { Agencia } from "@/types/database";

export function ConfiguracoesForm({
  action,
  initial,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  initial: Agencia;
}) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(formData: FormData) {
    setSaving(true);
    const res = await action(formData);
    setSaving(false);
    if (res?.error) toast.error(res.error);
    else toast.success("Configurações salvas!");
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Dados da agência</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nome fantasia *</label>
            <input name="nome" className="input" required defaultValue={initial.nome_fantasia} />
          </div>
          <div>
            <label className="label">Razão social</label>
            <input name="razao_social" className="input" defaultValue={initial.razao_social ?? ""} />
          </div>
          <div>
            <label className="label">CNPJ</label>
            <input name="cnpj" className="input" defaultValue={initial.cnpj ?? ""} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input name="telefone" className="input" defaultValue={initial.telefone ?? ""} />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input name="email" type="email" className="input" defaultValue={initial.email_contato ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Endereço</label>
            <input name="endereco" className="input" defaultValue={initial.endereco ?? ""} />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Personalização</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Cor primária</label>
            <input name="cor_primaria" type="color" className="input h-10" defaultValue={initial.cor_primaria ?? "#3D5AFE"} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Logo da agência</label>
            <LogoUpload initialUrl={initial.logo_url} />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" />}>
          Salvar configurações
        </Button>
      </div>
    </form>
  );
}
