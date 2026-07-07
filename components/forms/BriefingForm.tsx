"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ClipboardList, Save } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface Pergunta {
  key: string;
  label: string;
  tipo?: "text" | "textarea";
  required?: boolean;
}

const PERGUNTAS: Pergunta[] = [
  { key: "sobre_empresa", label: "Conte um pouco sobre a empresa", tipo: "textarea", required: true },
  { key: "publico_alvo", label: "Quem é o público-alvo?", tipo: "textarea", required: true },
  { key: "objetivos", label: "Quais são os principais objetivos de marketing?", tipo: "textarea", required: true },
  { key: "concorrentes", label: "Quem são os principais concorrentes?", tipo: "textarea" },
  { key: "tom_voz", label: "Como você descreveria o tom de voz da marca?", tipo: "textarea" },
  { key: "cores_proibidas", label: "Existem cores, palavras ou temas a evitar?", tipo: "textarea" },
  { key: "canais", label: "Quais canais de comunicação devem ser trabalhados?", tipo: "text" },
  { key: "orcamento", label: "Existe um orçamento mensal para mídia paga?", tipo: "text" },
];

export function BriefingForm({ action }: { action: (formData: FormData) => Promise<{ error?: string } | void> }) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(formData: FormData) {
    setSaving(true);
    const respostas: Record<string, string> = {};
    for (const p of PERGUNTAS) {
      const v = formData.get(p.key);
      if (typeof v === "string") respostas[p.key] = v;
    }
    const fd = new FormData();
    fd.set("respostas", JSON.stringify(respostas));
    const res = await action(fd);
    setSaving(false);
    if (res?.error) toast.error(res.error);
    else toast.success("Briefing enviado com sucesso!");
  }

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-1">
        <ClipboardList className="h-4 w-4 text-royal-300" />
        Briefing
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        Preencha as informações abaixo para nos ajudar a entender melhor seu negócio.
      </p>
      <form action={onSubmit} className="space-y-4">
        {PERGUNTAS.map((p) => (
          <div key={p.key}>
            <label className="label">
              {p.label} {p.required && <span className="text-rose-400">*</span>}
            </label>
            {p.tipo === "textarea" ? (
              <textarea
                name={p.key}
                className="input min-h-[80px]"
                required={p.required}
              />
            ) : (
              <input name={p.key} className="input" required={p.required} />
            )}
          </div>
        ))}
        <div className="pt-3 border-t border-border flex justify-end">
          <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" />}>
            Enviar briefing
          </Button>
        </div>
      </form>
    </Card>
  );
}
