"use client";

import { Button } from "@/components/ui/Button";
import { FileDown } from "lucide-react";

/**
 * Gera e baixa um modelo CSV (compatível com Excel pt-BR, separador `;`)
 * pro usuário preencher e subir via ImportarDatasForm.
 */
export function BaixarModeloCsvButton() {
  function baixar() {
    const conteudo =
      "data;nome;segmento\n" +
      "01/01/2026;Ano Novo;varejo,geral\n" +
      "14/02/2026;Dia dos Namorados;varejo\n" +
      "25/12/2026;Natal;geral\n";
    const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-datas-comemorativas.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={baixar}
      iconLeft={<FileDown className="h-4 w-4" />}
    >
      Baixar modelo
    </Button>
  );
}