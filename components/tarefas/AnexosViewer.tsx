"use client";

import {
  FileText,
  Image as ImageIcon,
  Paperclip,
  Video,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";

export type AnexoViewItem = {
  id: string;
  nome_original: string;
  mime: string;
  tamanho: number;
  url: string;
};

function iconePorMime(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Video;
  return FileText;
}

export function AnexosViewer({ anexos }: { anexos: AnexoViewItem[] }) {
  if (!anexos || anexos.length === 0) return null;

  const imagens = anexos.filter((a) => a.mime.startsWith("image/"));
  const outros = anexos.filter((a) => !a.mime.startsWith("image/"));

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Anexos
      </p>

      {imagens.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {imagens.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              title={a.nome_original}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.nome_original}
                className="w-full h-28 object-cover rounded-md border border-border hover:opacity-90 transition"
              />
            </a>
          ))}
        </div>
      )}

      {outros.length > 0 && (
        <ul className="space-y-1">
          {outros.map((a) => {
            const Icone = iconePorMime(a.mime);
            return (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-md border border-border bg-bg-elevated/40 px-2 py-1.5"
              >
                <Icone className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-200 hover:text-royal-200 truncate block"
                  >
                    {a.nome_original}
                  </a>
                  <p className="text-[10px] text-slate-500">
                    {formatBytes(a.tamanho)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {anexos.length === 0 && (
        <p className="inline-flex items-center gap-1 text-[10px] text-slate-600">
          <Paperclip className="h-3 w-3" /> Nenhum anexo.
        </p>
      )}
    </div>
  );
}