"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Eye, Pencil, Save, Plus, X } from "lucide-react";
import type { VariavelContrato } from "@/types/database";
import { TemplatePreview } from "./TemplatePreview";

interface TemplateEditorProps {
  initialName: string;
  initialContent: string;
  initialVariaveis?: VariavelContrato[];
  initialDescription?: string;
  /** Valores usados apenas no preview ao vivo. */
  previewValues?: Record<string, unknown>;
  /** Salva o template (server action passado). */
  onSave: (data: {
    nome: string;
    descricao: string;
    conteudo: string;
    variaveis: VariavelContrato[];
  }) => Promise<void>;
  saving?: boolean;
}

/**
 * Editor de template com preview ao vivo.
 * Suporta adicionar/remover variáveis declaradas e editar o conteúdo.
 */
export function TemplateEditor({
  initialName,
  initialContent,
  initialVariaveis = [],
  initialDescription = "",
  previewValues = {},
  onSave,
  saving,
}: TemplateEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [nome, setNome] = useState(initialName);
  const [descricao, setDescricao] = useState(initialDescription);
  const [conteudo, setConteudo] = useState(initialContent);
  const [variaveis, setVariaveis] = useState<VariavelContrato[]>(initialVariaveis);

  const placeholdersFound = useMemo(() => {
    const re = /\{\{\s*([\w.]+)\s*\}\}/g;
    const set = new Set<string>();
    let m;
    while ((m = re.exec(conteudo)) !== null) set.add(m[1]!);
    return Array.from(set);
  }, [conteudo]);

  function addVariavel() {
    setVariaveis((v) => [
      ...v,
      { key: "", label: "", type: "string" },
    ]);
  }
  function updateVariavel(i: number, patch: Partial<VariavelContrato>) {
    setVariaveis((v) => v.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeVariavel(i: number) {
    setVariaveis((v) => v.filter((_, idx) => idx !== i));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-100">
            {mode === "edit" ? "Editar template" : "Conteúdo"}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "edit" ? "outline" : "secondary"}
              onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
              iconLeft={mode === "edit" ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            >
              {mode === "edit" ? "Preview" : "Editar"}
            </Button>
          </div>
        </div>

        {mode === "edit" ? (
          <div className="space-y-3">
            <div>
              <label className="label">Nome do template *</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label className="label">Descrição</label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div>
              <label className="label">Conteúdo (HTML com placeholders)</label>
              <Textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                className="font-mono text-xs min-h-[400px]"
                placeholder="<h1>Contrato</h1><p>...</p>"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use <code className="text-royal-300">{"{{chave}}"}</code> para placeholders.
                Encontrados: {placeholdersFound.length}.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label !mb-0">Variáveis declaradas</label>
                <Button type="button" size="sm" variant="ghost" onClick={addVariavel} iconLeft={<Plus className="h-3.5 w-3.5" />}>
                  Adicionar
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {variaveis.map((v, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-4"
                      placeholder="chave.exemplo"
                      value={v.key}
                      onChange={(e) => updateVariavel(i, { key: e.target.value })}
                    />
                    <Input
                      className="col-span-5"
                      placeholder="Rótulo"
                      value={v.label}
                      onChange={(e) => updateVariavel(i, { label: e.target.value })}
                    />
                    <select
                      className="input col-span-2"
                      value={v.type}
                      onChange={(e) => updateVariavel(i, { type: e.target.value as VariavelContrato["type"] })}
                    >
                      <option value="string">texto</option>
                      <option value="number">número</option>
                      <option value="date">data</option>
                      <option value="currency">R$</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeVariavel(i)}
                      className="col-span-1 text-slate-500 hover:text-danger-400"
                      aria-label="Remover"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button
                onClick={() =>
                  onSave({
                    nome,
                    descricao,
                    conteudo,
                    variaveis: variaveis.filter((v) => v.key && v.label),
                  })
                }
                loading={saving}
                iconLeft={<Save className="h-4 w-4" />}
              >
                Salvar template
              </Button>
            </div>
          </div>
        ) : (
          <TemplatePreview
            template={conteudo}
            values={previewValues}
            variaveis={variaveis}
          />
        )}
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Preview ao vivo</h3>
        <TemplatePreview
          template={conteudo}
          values={previewValues}
          variaveis={variaveis}
        />
      </div>
    </div>
  );
}
