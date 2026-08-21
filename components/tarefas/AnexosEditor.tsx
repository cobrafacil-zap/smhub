"use client";

import { useRef, useState, useTransition } from "react";
import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Upload,
  Video,
  Loader2,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  TAREFA_ANEXO_MAX_BYTES,
  TAREFA_ANEXO_MIME_PERMITIDOS,
} from "@/lib/constants";
import {
  excluirAnexoAction,
  uploadAnexoAction,
} from "@/lib/actions/tarefa-anexo-actions";

export type AnexoItem = {
  id: string;
  nome_original: string;
  mime: string;
  tamanho: number;
  /** URL signed pronta pra exibir (regenerada pelo pai). */
  url: string;
};

function iconePorMime(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Video;
  return FileText;
}

export function AnexosEditor({
  tarefaId,
  anexos,
  onChange,
}: {
  tarefaId: string;
  anexos: AnexoItem[];
  onChange: (novo: AnexoItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const lista = Array.from(files);
    // Validação client-side (defesa em profundidade — o server também valida)
    for (const f of lista) {
      if (f.size > TAREFA_ANEXO_MAX_BYTES) {
        setError(`"${f.name}" passa de ${formatBytes(TAREFA_ANEXO_MAX_BYTES)}.`);
        return;
      }
      if (!(TAREFA_ANEXO_MIME_PERMITIDOS as readonly string[]).includes(f.type)) {
        setError(`Tipo de "${f.name}" não permitido (${f.type || "desconhecido"}).`);
        return;
      }
    }

    startTransition(async () => {
      // A action recebe UM arquivo por chamada (formData.get("arquivo"));
      // enviamos um por vez para que cada erro fique vinculado ao arquivo.
      const adicionados: AnexoItem[] = [];
      for (const f of lista) {
        const fd = new FormData();
        fd.set("arquivo", f);
        const res = await uploadAnexoAction(tarefaId, fd);
        if (res?.error) {
          setError(`"${f.name}": ${res.error}`);
          // segue com os próximos
          continue;
        }
        if (res?.id) {
          // O pai vai revalidar e recarregar a página, então não precisamos
          // da URL aqui — a próxima renderização traz a lista completa do
          // server. Mas pra UX imediata, pedimos uma signed URL.
          const { getAnexoSignedUrlAction } = await import(
            "@/lib/actions/tarefa-anexo-actions"
          );
          const urlRes = await getAnexoSignedUrlAction(res.id);
          if (urlRes?.signedUrl) {
            adicionados.push({
              id: res.id,
              nome_original: f.name,
              mime: f.type,
              tamanho: f.size,
              url: urlRes.signedUrl,
            });
          }
        }
      }
      if (adicionados.length > 0) {
        onChange([...anexos, ...adicionados]);
      }
    });
  }

  function excluir(id: string) {
    if (!confirm("Excluir este anexo?")) return;
    startTransition(async () => {
      const res = await excluirAnexoAction(id);
      if (res?.error) {
        alert(res.error);
        return;
      }
      onChange(anexos.filter((a) => a.id !== id));
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Anexos
        </label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => inputRef.current?.click()}
          loading={pending}
        >
          <Upload className="h-3.5 w-3.5" /> Adicionar
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={TAREFA_ANEXO_MIME_PERMITIDOS.join(",")}
          className="hidden"
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = ""; // permite re-upload do mesmo arquivo
          }}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed transition px-3 py-4 text-center text-xs text-slate-500",
          dragOver
            ? "border-royal-500 bg-royal-500/5 text-royal-200"
            : "border-border"
        )}
      >
        {pending ? (
          <p className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando…
          </p>
        ) : (
          <p>
            Arraste arquivos aqui ou{" "}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-royal-200 hover:underline"
            >
              escolha do dispositivo
            </button>
            .
            <br />
            <span className="text-[10px] text-slate-600">
              Até {formatBytes(TAREFA_ANEXO_MAX_BYTES)} · imagem, PDF ou vídeo.
            </span>
          </p>
        )}
      </div>

      {error && <p className="text-[10px] text-danger-400">{error}</p>}

      {anexos.length > 0 && (
        <ul className="space-y-1">
          {anexos.map((a) => {
            const Icone = iconePorMime(a.mime);
            const ehImagem = a.mime.startsWith("image/");
            return (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-md border border-border bg-bg-elevated/40 px-2 py-1.5"
              >
                {ehImagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.url}
                    alt={a.nome_original}
                    className="h-9 w-9 object-cover rounded border border-border shrink-0"
                  />
                ) : (
                  <Icone className="h-4 w-4 text-slate-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-200 hover:text-royal-200 truncate block"
                    title={a.nome_original}
                  >
                    {a.nome_original}
                  </a>
                  <p className="text-[10px] text-slate-500">
                    {formatBytes(a.tamanho)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => excluir(a.id)}
                  className="text-slate-500 hover:text-danger-400"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {anexos.length === 0 && !pending && (
        <p className="inline-flex items-center gap-1 text-[10px] text-slate-600">
          <Paperclip className="h-3 w-3" /> Nenhum anexo.
        </p>
      )}
    </div>
  );
}