"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Save } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { LogoUpload } from "@/components/forms/LogoUpload";
import { STORAGE_BUCKETS } from "@/lib/constants";

interface PlatformLogoFormProps {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  initialLight: string | null;
  initialDark: string | null;
}

/**
 * Form do super-admin para configurar a logo da plataforma (variantes
 * claro/escuro). Aparece em todo o site (landing, login, checkout, painel).
 */
export function PlatformLogoForm({
  action,
  initialLight,
  initialDark,
}: PlatformLogoFormProps) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(formData: FormData) {
    setSaving(true);
    const res = await action(formData);
    setSaving(false);
    if (res?.error) toast.error(res.error);
    else toast.success("Logos da plataforma salvas!");
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-1">
          Logo da plataforma
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Exibida em todo o site (landing, login, checkout, painel). Envie uma
          versão para fundo claro e outra para fundo escuro — o tema escolhido
          pelo usuário decide qual aparece.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label">Logo — modo claro</label>
            <LogoUpload
              name="logo_url_light"
              bucket={STORAGE_BUCKETS.platform}
              pathPrefix="logos/light"
              label="Logo para fundo claro (ex.: landing)."
              hint="Use cores escuras sobre fundo claro. PNG, JPG, WebP ou SVG — máx 2 MB."
              previewClassName="bg-white"
              initialUrl={initialLight}
            />
          </div>

          <div className="space-y-2">
            <label className="label">Logo — modo escuro</label>
            <LogoUpload
              name="logo_url_dark"
              bucket={STORAGE_BUCKETS.platform}
              pathPrefix="logos/dark"
              label="Logo para fundo escuro (ex.: painel)."
              hint="Use cores claras sobre fundo escuro. PNG, JPG, WebP ou SVG — máx 2 MB."
              previewClassName="bg-bg-surface"
              initialUrl={initialDark}
            />
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          Se uma das versões ficar vazia, o site usa <code>/logo-full.svg</code>{" "}
          como fallback.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" />}>
          Salvar logos
        </Button>
      </div>
    </form>
  );
}