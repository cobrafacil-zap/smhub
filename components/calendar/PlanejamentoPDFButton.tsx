"use client";

import { Button } from "@/components/ui/Button";
import { FileDown, ExternalLink } from "lucide-react";

/**
 * Botão que abre a página de impressão do planejamento (A4) num novo tab.
 * O usuário usa Ctrl/Cmd+P → "Salvar como PDF". Mesma estratégia do
 * ContractPDFButton (evita @react-pdf/renderer no serverless da Vercel).
 */
export function PlanejamentoPDFButton({
  planejamentoId,
  label = "Baixar PDF",
  size = "sm",
  variant = "secondary",
}: {
  planejamentoId: string;
  label?: string;
  size?: "sm" | "md";
  variant?: "secondary" | "primary" | "ghost";
}) {
  return (
    <a
      href={`/admin/planejamentos/${planejamentoId}/imprimir`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button
        type="button"
        variant={variant}
        size={size}
        iconLeft={<FileDown className="h-4 w-4" />}
      >
        {label}
        <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
      </Button>
    </a>
  );
}