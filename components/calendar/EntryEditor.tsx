"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ENTRY_TIPOS, ENTRY_STATUS, ENTRY_TIPO_COR, ENTRY_TIPO_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/calendar";
import type { EntradaStatus, EntradaTipo, PlanejamentoEntrada } from "@/types/database";
import { cn } from "@/lib/utils";
import { Save, X } from "lucide-react";

interface EntryEditorProps {
  initial?: Partial<PlanejamentoEntrada>;
  /** Data pré-preenchida quando criando nova entrada. */
  defaultDate?: string;
  /** Se o usuário pode editar (admin) ou só ver (cliente). */
  readOnly?: boolean;
  /** Membros da equipe disponíveis para atribuição (responsável pela peça). */
  membros?: { id: string; nome: string }[];
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
  estilo: string;
  responsavelId: string | null;
}

export function EntryEditor({
  initial,
  defaultDate,
  readOnly = false,
  membros,
  onSave,
  onCancel,
  onDelete,
}: EntryEditorProps) {
  // Hoje em fuso LOCAL (não UTC) — new Date().toISOString() pula o dia à noite no BR.
  const [data, setData] = useState(initial?.data ?? defaultDate ?? formatDate(new Date()));
  const [tipo, setTipo] = useState<EntradaTipo>((initial?.tipo as EntradaTipo) ?? "post_feed");
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [copy, setCopy] = useState(initial?.copy ?? "");
  const [hashtagsText, setHashtagsText] = useState((initial?.hashtags ?? []).join(" "));
  const [status, setStatus] = useState<EntradaStatus>((initial?.status as EntradaStatus) ?? "pendente");
  const [estilo, setEstilo] = useState(initial?.estilo ?? "");
  const [responsavelId, setResponsavelId] = useState<string>(initial?.responsavel_id ?? "");
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
        estilo: estilo.trim(),
        responsavelId: responsavelId || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      {/* Cor é fixa por tipo (não é escolhida). Mostra apenas como referência. */}
      <div className="rounded-md bg-bg-elevated/40 border border-border px-3 py-2 flex items-center gap-2">
        <span
          className={cn("inline-block h-3.5 w-3.5 rounded-full border border-white/20", ENTRY_TIPO_COR[tipo]?.dot ?? ENTRY_TIPO_COR.post_feed.dot)}
          aria-hidden
        />
        <p className="text-[11px] text-slate-400">
          Cor no calendário definida pelo tipo ({ENTRY_TIPO_LABEL?.[tipo] ?? tipo}).
        </p>
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
      {membros && membros.length > 0 && (
        <div>
          <label className="label">Responsável pela peça</label>
          <Select
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
            disabled={readOnly}
          >
            <option value="">— Nenhum —</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
        </div>
      )}
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
