"use client";

import { useEffect, useRef } from "react";
import { X, Pencil, CalendarClock, Users2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, initials } from "@/lib/utils";
import { ENTRY_TIPO_LABEL, ENTRY_STATUS, ENTRY_TIPO_COR } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { TarefaItem } from "@/app/admin/tarefas/page";

const STATUS_LABEL: Record<string, string> = {
  destinada: "Tarefa destinada",
  em_andamento: "Em andamento",
  pronta: "Pronta",
  entregue: "Entregue",
};
const PRIORIDADE_VARIANTE: Record<string, "default" | "info" | "warning" | "danger"> = {
  baixa: "default",
  media: "info",
  alta: "warning",
  urgente: "danger",
};
const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

function avatarColor(nome: string) {
  const colors = [
    "from-royal-500 to-royal-700",
    "from-emerald-500 to-emerald-700",
    "from-amber-500 to-amber-700",
    "from-pink-500 to-pink-700",
    "from-sky-500 to-sky-700",
    "from-violet-500 to-violet-700",
  ];
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url);
}

export function TarefaDetailDialog({
  open,
  tarefa,
  podeEditar,
  onEdit,
  onClose,
}: {
  open: boolean;
  tarefa: TarefaItem | null;
  podeEditar: boolean;
  onEdit: (t: TarefaItem) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  if (!tarefa) return null;

  const e = tarefa.entrada;
  const tipoLabel = e ? ENTRY_TIPO_LABEL[e.tipo] ?? e.tipo : null;
  const stEntrada = e ? ENTRY_STATUS[e.status as keyof typeof ENTRY_STATUS] : null;
  const corTipo = e ? ENTRY_TIPO_COR[e.tipo] ?? ENTRY_TIPO_COR.post_feed : null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazoDate = tarefa.prazo ? new Date(tarefa.prazo + "T00:00:00") : null;
  const vencido = prazoDate && prazoDate < hoje && tarefa.status !== "entregue";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cn(
        "backdrop:bg-black/60 rounded-xl p-0 w-full max-w-2xl text-slate-100",
        "bg-bg-surface border border-border shadow-xl"
      )}
    >
      <div className="p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-100 break-words">{tarefa.titulo}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge variant="brand">{STATUS_LABEL[tarefa.status] ?? tarefa.status}</Badge>
              <Badge variant={PRIORIDADE_VARIANTE[tarefa.prioridade] ?? "default"}>
                {PRIORIDADE_LABEL[tarefa.prioridade] ?? tarefa.prioridade}
              </Badge>
              {tarefa.cliente_nome && (
                <span className="text-[11px] text-slate-400 bg-bg-elevated border border-border rounded px-1.5 py-0.5">
                  {tarefa.cliente_nome}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Prazo */}
        {tarefa.prazo && (
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            <span className={vencido ? "text-danger-400 font-medium" : "text-slate-300"}>
              Entregar até {new Date(tarefa.prazo + "T00:00:00").toLocaleDateString("pt-BR")}
              {vencido && " (vencido)"}
            </span>
          </div>
        )}

        {/* Responsáveis */}
        {tarefa.responsaveis.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Users2 className="h-3 w-3" /> Responsáveis
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tarefa.responsaveis.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-bg-elevated border border-border rounded-full pl-1 pr-2 py-0.5"
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-semibold",
                      avatarColor(r.nome)
                    )}
                  >
                    {initials(r.nome)}
                  </span>
                  {r.nome}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Descrição da tarefa */}
        {tarefa.descricao && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Descrição</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{tarefa.descricao}</p>
          </div>
        )}

        {/* Peça do planejamento vinculada */}
        {e && (
          <div className="rounded-lg border border-border bg-bg-elevated/40 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn("inline-block h-3 w-3 rounded-full border border-white/20", corTipo?.dot)}
                aria-hidden
              />
              <p className="text-sm font-semibold text-slate-100">{e.titulo}</p>
              {tipoLabel && <Badge variant="default">{tipoLabel}</Badge>}
              {stEntrada && <Badge variant={stEntrada.color}>{stEntrada.label}</Badge>}
              {e.estilo && <span className="text-[11px] text-slate-400 italic">{e.estilo}</span>}
              <span className="text-[11px] text-slate-500">{formatDate(e.data)}</span>
            </div>

            {/* Arte */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Arte
              </p>
              {e.midia_url && e.midia_url.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {e.midia_url.map((url, i) =>
                    isVideoUrl(url) ? (
                      <video
                        key={i}
                        src={url}
                        controls
                        className="w-full rounded-md border border-border bg-black max-h-48"
                      />
                    ) : (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Arte ${i + 1}`}
                          className="w-full h-32 object-cover rounded-md border border-border bg-bg-elevated"
                        />
                      </a>
                    )
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Sem arte anexada.</p>
              )}
            </div>

            {/* Legenda (copy) */}
            {e.copy && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Legenda</p>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{e.copy}</p>
              </div>
            )}

            {/* Hashtags */}
            {e.hashtags && e.hashtags.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hashtags</p>
                <p className="text-xs text-royal-300 break-words">{e.hashtags.join(" ")}</p>
              </div>
            )}

            {/* Briefing interno */}
            {e.descricao && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Briefing interno
                </p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{e.descricao}</p>
              </div>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          {podeEditar && (
            <Button
              type="button"
              iconLeft={<Pencil className="h-4 w-4" />}
              onClick={() => onEdit(tarefa)}
            >
              Editar
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}