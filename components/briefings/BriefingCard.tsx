"use client";

import { useState } from "react";
import { X, ClipboardList, Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EditarBriefingButton } from "@/app/admin/clientes/[id]/EditarBriefingButton";
import { cn, formatDate } from "@/lib/utils";

export type BriefingPar = { pergunta: string; resposta: string };

// Tintes por cliente (barra lateral + fundo leve) pra diferenciar visual.
const BRIEF_TINTS = [
  { bar: "border-l-royal-500/70", bg: "bg-royal-500/[0.06]" },
  { bar: "border-l-emerald-500/70", bg: "bg-emerald-500/[0.06]" },
  { bar: "border-l-amber-500/70", bg: "bg-amber-500/[0.06]" },
  { bar: "border-l-pink-500/70", bg: "bg-pink-500/[0.06]" },
  { bar: "border-l-sky-500/70", bg: "bg-sky-500/[0.06]" },
  { bar: "border-l-violet-500/70", bg: "bg-violet-500/[0.06]" },
];
function tintDe(chave: string) {
  let h = 0;
  for (let i = 0; i < chave.length; i++) h = (h * 31 + chave.charCodeAt(i)) >>> 0;
  return BRIEF_TINTS[h % BRIEF_TINTS.length];
}

export function BriefingCard({
  briefingId,
  clienteId,
  clienteNome,
  titulo,
  pares,
  createdAt,
  interno,
  podeEditar,
}: {
  briefingId: string;
  clienteId: string | null;
  clienteNome: string;
  titulo: string;
  pares: BriefingPar[];
  createdAt: string;
  interno: boolean;
  podeEditar: boolean;
}) {
  const [ver, setVer] = useState(false);
  const tint = tintDe(clienteId ?? briefingId);
  const preview = pares.slice(0, 3);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setVer(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setVer(true);
          }
        }}
        className={cn(
          "card border-l-2 space-y-2 cursor-pointer hover:border-royal-500/40 transition",
          tint.bar,
          tint.bg
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="h-4 w-4 text-slate-400 shrink-0" />
            <p className="font-medium text-slate-100 truncate">{clienteNome}</p>
            {interno && (
              <Badge variant="warning" className="!text-[10px] !px-1.5 !py-0">
                Interno
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {podeEditar ? (
              <span
                onClick={(e) => e.stopPropagation()}
                className="inline-flex"
              >
                <EditarBriefingButton
                  briefingId={briefingId}
                  tituloInicial={titulo}
                  paresIniciais={pares}
                />
              </span>
            ) : (
              <span
                title="Somente leitura"
                className="inline-flex items-center gap-1 text-[10px] text-slate-500"
              >
                <Lock className="h-3 w-3" /> ver
              </span>
            )}
            <p className="text-xs text-slate-500">{formatDate(createdAt)}</p>
          </div>
        </div>

        {pares.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Sem respostas.</p>
        ) : (
          <div className="space-y-1.5 text-sm text-slate-300">
            {preview.map((p, i) => (
              <div key={i}>
                <p className="text-slate-400 text-xs uppercase tracking-wider">{p.pergunta}</p>
                <p className="text-slate-100 whitespace-pre-wrap line-clamp-1">
                  {p.resposta || <span className="italic text-slate-500">Sem resposta</span>}
                </p>
              </div>
            ))}
            {pares.length > 3 && (
              <p className="text-[11px] text-royal-300 pt-0.5">
                +{pares.length - 3} resposta(s) — clique para ver tudo
              </p>
            )}
          </div>
        )}
      </div>

      {/* Dialog de visualização (somente leitura) — briefing completo */}
      {ver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
          onClick={() => setVer(false)}
        >
          <div
            className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-bg-surface pb-3 border-b border-border -mx-5 px-5 -mt-5 pt-5 z-10">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-100 truncate">{clienteNome}</h3>
                <p className="text-xs text-slate-500">
                  {titulo} · {formatDate(createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVer(false)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-bg-elevated shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {pares.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Sem respostas.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {pares.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-elevated/30 p-3">
                    <p className="text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                      {p.pergunta}
                    </p>
                    <p className="text-slate-100 whitespace-pre-wrap">
                      {p.resposta || <span className="italic text-slate-500">Sem resposta</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border">
              {podeEditar ? (
                <span className="inline-flex">
                  <EditarBriefingButton
                    briefingId={briefingId}
                    tituloInicial={titulo}
                    paresIniciais={pares}
                  />
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setVer(false)}
                className="text-sm text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-md border border-border hover:bg-bg-elevated"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}