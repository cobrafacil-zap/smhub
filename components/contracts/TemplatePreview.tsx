"use client";

import { useMemo } from "react";
import { renderTemplate } from "@/lib/contracts/render";
import { Card } from "@/components/ui/Card";
import type { VariavelContrato } from "@/types/database";

interface TemplatePreviewProps {
  template: string;
  values: Record<string, unknown>;
  variaveis?: VariavelContrato[];
  className?: string;
}

/**
 * Renderiza o template com placeholders substituídos pelos valores atuais.
 * Mostra placeholders não preenchidos destacados em amarelo.
 */
export function TemplatePreview({ template, values, variaveis, className }: TemplatePreviewProps) {
  const html = useMemo(() => renderTemplate(template, values, variaveis ?? []), [template, values, variaveis]);

  // Destaca __placeholders__ não preenchidos
  const styled = html.replace(
    /__([\w.]+)__/g,
    '<span class="bg-warning-500/20 text-warning-400 px-1.5 py-0.5 rounded text-xs font-mono">$1</span>'
  );

  return (
    <Card className={className}>
      <div
        className="prose prose-invert prose-sm max-w-none text-slate-200
          prose-headings:text-slate-100 prose-h1:text-2xl prose-h2:text-lg prose-h2:mt-6
          prose-strong:text-slate-100 prose-li:text-slate-300"
        dangerouslySetInnerHTML={{ __html: styled }}
      />
    </Card>
  );
}
