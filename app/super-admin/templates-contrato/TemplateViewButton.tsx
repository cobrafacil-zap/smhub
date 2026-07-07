"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eye, X, Copy, CheckCircle2 } from "lucide-react";
import type { VariavelContrato } from "@/types/database";

/**
 * Renderiza o conteúdo HTML do template com placeholders visíveis,
 * e mostra as variáveis detectadas. Read-only.
 */
function renderConteudo(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

export function TemplateViewButton({
  nome,
  conteudo,
  variaveis,
}: {
  nome: string;
  conteudo: string;
  variaveis: VariavelContrato[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(conteudo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        iconLeft={<Eye className="h-3.5 w-3.5" />}
      >
        Visualizar modelo
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-bg-surface border border-border rounded-lg shadow-xl max-w-3xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-slate-100">{nome}</p>
                <p className="text-xs text-slate-500">Visualização do modelo (read-only)</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copiar}
                  iconLeft={copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                >
                  {copied ? "Copiado!" : "Copiar texto"}
                </Button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded hover:bg-bg-elevated text-slate-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {variaveis.length > 0 && (
              <div className="px-4 pt-3 pb-2 border-b border-border bg-bg/50">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                  Variáveis detectadas
                </p>
                <div className="flex flex-wrap gap-2">
                  {variaveis.map((v) => (
                    <div
                      key={v.key}
                      className="text-[11px] bg-bg-elevated border border-border rounded px-2 py-1"
                      title={v.label}
                    >
                      <code className="text-royal-300">{`{{${v.key}}}`}</code>
                      <span className="text-slate-500 ml-1.5">— {v.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="p-6 max-h-[60vh] overflow-y-auto text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-mono"
              dangerouslySetInnerHTML={{ __html: renderConteudo(conteudo) }}
            />
          </div>
        </div>
      )}
    </>
  );
}
