"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ENTRY_TIPOS, ENTRY_STATUS } from "@/lib/constants";
import type { EntradaStatus, EntradaTipo, PlanejamentoEntrada } from "@/types/database";
import { cn } from "@/lib/utils";
import { Save, X } from "lucide-react";

// Cores predefinidas pra diferenciar os posts no calendário. O usuário escolhe
// uma dessas (em vez de digitar hex / usar color picker livre).
const CORES: { nome: string; value: string }[] = [
  { nome: "Azul", value: "#3B82F6" },
  { nome: "Roxo", value: "#8B5CF6" },
  { nome: "Verde", value: "#22C55E" },
  { nome: "Vermelho", value: "#EF4444" },
  { nome: "Laranja", value: "#F97316" },
  { nome: "Amarelo", value: "#EAB308" },
  { nome: "Rosa", value: "#EC4899" },
  { nome: "Ciano", value: "#06B6D4" },
];

interface EntryEditorProps {
  initial?: Partial<PlanejamentoEntrada>;
  /** Data pré-preenchida quando criando nova entrada. */
  defaultDate?: string;
  /** Se o usuário pode editar (admin) ou só ver (cliente). */
  readOnly?: boolean;
  onSave?: (data: EntryFormData) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => Promise<void>;
}

export interface EntryFormData {
  data: string;
  tipo: EntradaTipo;
  titulo: string;
  descricao: string;
  copy: string;
  hashtags: string[];
  status: EntradaStatus;
  cor: string;
  estilo: string;
}

export function EntryEditor({
  initial,
  defaultDate,
  readOnly = false,
  onSave,
  onCancel,
  onDelete,
}: EntryEditorProps) {
  const [data, setData] = useState(initial?.data ?? defaultDate ?? new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<EntradaTipo>((initial?.tipo as EntradaTipo) ?? "post_feed");
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [copy, setCopy] = useState(initial?.copy ?? "");
  const [hashtagsText, setHashtagsText] = useState((initial?.hashtags ?? []).join(" "));
  const [status, setStatus] = useState<EntradaStatus>((initial?.status as EntradaStatus) ?? "pendente");
  const [cor, setCor] = useState(initial?.cor ?? "");
  const [estilo, setEstilo] = useState(initial?.estilo ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({
        data,
        tipo,
        titulo,
        descricao,
        copy,
        hashtags: hashtagsText
          .split(/\s+/)
          .map((h) => h.trim())
          .filter(Boolean)
          .map((h) => (h.startsWith("#") ? h : `#${h}`)),
        status,
        cor,
        estilo: estilo.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Data</label>
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div>
          <label className="label">Tipo</label>
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as EntradaTipo)}
            disabled={readOnly}
          >
            {ENTRY_TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <label className="label">Título</label>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          disabled={readOnly}
          placeholder="Ex: Post sobre promoção de Natal"
        />
      </div>
      <div>
        <label className="label">Descrição interna</label>
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          disabled={readOnly}
          placeholder="Anotações, contexto, briefing..."
          rows={2}
        />
      </div>
      <div>
        <label className="label">Copy da postagem</label>
        <Textarea
          value={copy}
          onChange={(e) => setCopy(e.target.value)}
          disabled={readOnly}
          rows={4}
          placeholder="Texto que será publicado..."
        />
      </div>
      <div>
        <label className="label">Hashtags (separadas por espaço)</label>
        <Input
          value={hashtagsText}
          onChange={(e) => setHashtagsText(e.target.value)}
          disabled={readOnly}
          placeholder="#marketing #socialmedia"
        />
      </div>
      {/* Cor + estilo: ajudam a diferenciar os conteúdos no calendário */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Cor do post</label>
          <div className="flex flex-wrap items-center gap-2">
            {CORES.map((c) => {
              const sel = cor.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setCor(sel ? "" : c.value)}
                  title={c.nome}
                  aria-label={c.nome}
                  aria-pressed={sel}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition disabled:opacity-50",
                    sel
                      ? "border-white ring-2 ring-white/40 scale-110"
                      : "border-border hover:scale-105"
                  )}
                  style={{ backgroundColor: c.value }}
                />
              );
            })}
            {cor && !readOnly && (
              <button
                type="button"
                onClick={() => setCor("")}
                className="text-xs text-slate-400 hover:text-slate-200 px-1"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="label">Estilo / categoria</label>
          <Input
            value={estilo}
            onChange={(e) => setEstilo(e.target.value)}
            disabled={readOnly}
            placeholder="Ex.: Promoção, Educativo… (opcional)"
            className="w-full"
          />
        </div>
      </div>
      <div>
        <label className="label">Status</label>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as EntradaStatus)}
          disabled={readOnly}
        >
          {Object.entries(ENTRY_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </div>
      {!readOnly && (
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
          {onDelete && initial?.id ? (
            <Button variant="danger" size="sm" onClick={() => onDelete()}>
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} iconLeft={<X className="h-4 w-4" />}>
                Cancelar
              </Button>
            )}
            {onSave && (
              <Button onClick={handleSave} loading={saving} iconLeft={<Save className="h-4 w-4" />}>
                Salvar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
