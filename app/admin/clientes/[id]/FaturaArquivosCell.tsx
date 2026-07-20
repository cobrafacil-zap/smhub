"use client";

import { useState, useRef, useTransition } from "react";
import { Paperclip, Upload, FileText, X, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import {
  uploadFaturaArquivoAction,
  deletarFaturaArquivoAction,
} from "@/lib/actions/fatura-briefing-actions";
import type { FaturaArquivo } from "@/types/database";

const TIPO_LABEL: Record<string, string> = {
  boleto: "Boleto",
  nota_fiscal: "Nota Fiscal",
  outro: "Outro",
};

function formatTamanho(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FaturaArquivosCell({
  faturaId,
  arquivos,
}: {
  faturaId: string;
  arquivos: FaturaArquivo[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<"boleto" | "nota_fiscal" | "outro">("boleto");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("fatura_id", faturaId);
    fd.set("tipo", tipo);
    fd.set("file", file);
    startTransition(async () => {
      const res = await uploadFaturaArquivoAction(fd);
      if (res?.error) toast.error(res.error);
      else toast.success("Arquivo enviado!");
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deletarFaturaArquivoAction(id);
      if (res?.error) toast.error(res.error);
      else toast.success("Arquivo removido.");
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1 relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs text-royal-300 hover:text-royal-200"
      >
        <Paperclip className="h-3.5 w-3.5" />
        {arquivos.length > 0 ? `${arquivos.length} arquivo(s)` : "Anexar"}
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-20 w-72 rounded-lg border border-border bg-bg-surface p-3 shadow-elevated space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-200">Arquivos da fatura</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-0.5 rounded text-slate-400 hover:text-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Upload */}
          <div className="space-y-1.5 border border-dashed border-border rounded-md p-2">
            <div className="flex items-center gap-1">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as "boleto" | "nota_fiscal" | "outro")}
                className="input text-xs flex-1"
              >
                <option value="boleto">Boleto</option>
                <option value="nota_fiscal">Nota Fiscal</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFile}
              className="hidden"
              id={`file-${faturaId}`}
            />
            <label htmlFor={`file-${faturaId}`}>
              <span className="inline-flex items-center gap-1.5 text-xs text-royal-300 hover:text-royal-200 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                {pending ? "Enviando..." : "Selecionar arquivo"}
              </span>
            </label>
            <p className="text-[10px] text-slate-500">PDF ou imagem (até 10MB).</p>
          </div>

          {/* Lista */}
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {arquivos.length === 0 && (
              <p className="text-xs text-slate-500 italic">Nenhum arquivo.</p>
            )}
            {arquivos.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md bg-bg-elevated/40 border border-border px-2 py-1.5"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <FileText className="h-3.5 w-3.5 text-royal-300 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-100 truncate" title={a.nome}>{a.nome}</p>
                    <p className="text-[10px] text-slate-500">
                      {TIPO_LABEL[a.tipo] ?? a.tipo}
                      {a.tamanho ? ` • ${formatTamanho(a.tamanho)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-slate-400 hover:text-royal-300"
                    title="Abrir"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <ConfirmDialog
                    title={`Excluir "${a.nome}"?`}
                    description="O arquivo será removido permanentemente."
                    confirmText="Excluir"
                    variant="danger"
                    trigger={
                      <button
                        type="button"
                        className="p-1 rounded text-slate-400 hover:text-danger-300"
                        title="Excluir"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    }
                    onConfirm={async () => {
                      const res = await deletarFaturaArquivoAction(a.id);
                      if (res?.error) {
                        toast.error(res.error);
                        throw new Error(res.error);
                      }
                      toast.success("Arquivo removido.");
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {pending && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processando...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
