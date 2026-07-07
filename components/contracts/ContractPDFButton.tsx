"use client";

import { Button } from "@/components/ui/Button";
import { FileDown, ExternalLink } from "lucide-react";

/**
 * Botão que abre uma página otimizada para impressão do contrato.
 * O usuário usa Ctrl/Cmd+P → "Salvar como PDF" no navegador.
 *
 * Estratégia: ao invés de usar @react-pdf/renderer server-side (que falha
 * no Vercel serverless), abrimos uma view HTML formatada A4 com
 * botão "Imprimir agora" + instrução de atalho. Funciona em qualquer
 * navegador, sem dependência de binário.
 */
export function ContractPDFButton({
  contratoId,
  basePath = "/admin/contratos",
  label = "Baixar PDF",
}: {
  contratoId: string;
  basePath?: string; // "/admin/contratos" ou "/cliente/contratos"
  label?: string;
}) {
  return (
    <a
      href={`${basePath}/${contratoId}/imprimir`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button type="button" variant="secondary" iconLeft={<FileDown className="h-4 w-4" />}>
        {label}
        <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
      </Button>
    </a>
  );
}
