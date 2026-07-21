"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ENTRY_STATUS, ENTRY_TIPO_LABEL } from "@/lib/constants";
import { clienteAprovarEntradaAction } from "@/lib/actions/cliente-convite-actions";
import { formatLongDate } from "@/lib/calendar";
import { toast } from "sonner";
import {
  Check,
  X,
  Pencil,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  ImageIcon,
  Film,
  Paperclip,
} from "lucide-react";
import type { EntradaStatus, EntradaTipo, PlanejamentoEntrada } from "@/types/database";

interface Props {
  entrada: PlanejamentoEntrada;
  /** Mostra os botões de aprovação (usado pela view do cliente). */
  showApproveActions?: boolean;
}

const statusBadge: Record<EntradaStatus, { label: string; cls: string }> = {
  pendente: { label: "Aguardando você", cls: "bg-warning-500/15 text-warning-300 border-warning-500/30" },
  aprovado: { label: "Aprovado", cls: "bg-success-500/15 text-success-400 border-success-500/30" },
  publicado: { label: "Publicado", cls: "bg-success-500/15 text-success-400 border-success-500/30" },
  rejeitado: { label: "Recusado", cls: "bg-danger-500/15 text-danger-400 border-danger-500/30" },
  alteracao_solicitada: {
    label: "Mudança solicitada",
    cls: "bg-warning-500/15 text-warning-300 border-warning-500/30",
  },
};

export function EntradaAprovacaoCard({ entrada, showApproveActions = true }: Props) {
  const [pending, startTransition] = useTransition();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState(entrada.aprovacao_comentario ?? "");
  const [expandido, setExpandido] = useState(true);

  function executar(decisao: "aprovado" | "rejeitado" | "alteracao_solicitada") {
    if (decisao === "alteracao_solicitada") {
      setShowFeedback(true);
      return;
    }
    confirmar(decisao, "");
  }

  function confirmar(decisao: "aprovado" | "rejeitado" | "alteracao_solicitada", comentario: string) {
    startTransition(async () => {
      const res = await clienteAprovarEntradaAction(entrada.id, decisao, comentario);
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      const label =
        decisao === "aprovado"
          ? "Post aprovado!"
          : decisao === "rejeitado"
          ? "Post recusado."
          : "Mudança enviada para a agência.";
      toast.success(label);
      setShowFeedback(false);
    });
  }

  const status = statusBadge[entrada.status];
  const tipoLabel = ENTRY_TIPO_LABEL[entrada.tipo as EntradaTipo] ?? entrada.tipo;

  return (
    <Card
      className={`!p-0 overflow-hidden border ${
        entrada.status === "alteracao_solicitada"
          ? "!border-warning-500/40"
          : entrada.status === "aprovado" || entrada.status === "publicado"
          ? "!border-success-500/30"
          : entrada.status === "rejeitado"
          ? "!border-danger-500/30"
          : "!border-border"
      }`}
    >
      {/* header */}
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-elevated/40 transition"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-md bg-royal-500/15 border border-royal-500/30 flex items-center justify-center shrink-0">
            <CalendarIcon className="h-4 w-4 text-royal-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-100 truncate">{entrada.titulo}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {formatLongDate(entrada.data)} • {tipoLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="default" className={status.cls}>
            {status.label}
          </Badge>
          {expandido ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {expandido && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          {/* Formato */}
          <div className="pt-3 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Formato
            </span>
            <Badge variant="brand">{tipoLabel}</Badge>
          </div>

          {/* Arte (mídia) — separada do texto da legenda */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Arte
            </p>
            {entrada.midia_url && entrada.midia_url.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {entrada.midia_url.map((url, i) => (
                  <MidiaPreview key={url + i} url={url} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Sem arte anexada.</p>
            )}
          </div>

          {/* Legenda (copy) — rotulada para o cliente saber que é a legenda do post */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Legenda
            </p>
            {entrada.copy ? (
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{entrada.copy}</p>
            ) : (
              <p className="text-xs text-slate-500 italic">Sem legenda.</p>
            )}
          </div>

          {entrada.hashtags && entrada.hashtags.length > 0 && (
            <p className="text-xs text-royal-300 line-clamp-2">{entrada.hashtags.join(" ")}</p>
          )}

          {/* comentário existente */}
          {entrada.aprovacao_comentario && entrada.status !== "pendente" && (
            <div className="rounded-md bg-royal-500/10 border border-royal-500/30 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-royal-300" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-royal-200">
                  Seu comentário
                </p>
              </div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">
                {entrada.aprovacao_comentario}
              </p>
            </div>
          )}

          {/* textarea inline para pedir mudança */}
          {showFeedback && (
            <div className="rounded-md bg-bg-elevated/50 border border-warning-500/30 px-3 py-2 space-y-2">
              <label className="label text-xs">O que você quer mudar?</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="input text-sm min-h-[80px]"
                placeholder="Ex: muda a cor de fundo para azul, troca a hashtag, adiciona uma frase..."
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowFeedback(false);
                    setFeedback(entrada.aprovacao_comentario ?? "");
                  }}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => confirmar("alteracao_solicitada", feedback)}
                  disabled={pending || feedback.trim().length === 0}
                  loading={pending}
                >
                  Enviar
                </Button>
              </div>
            </div>
          )}

          {/* ações */}
          {showApproveActions && !showFeedback && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => executar("aprovado")}
                disabled={pending}
                loading={pending}
                iconLeft={<Check className="h-4 w-4" />}
                className="!bg-success-600 hover:!bg-success-700"
              >
                Aprovar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => executar("rejeitado")}
                disabled={pending}
                iconLeft={<X className="h-4 w-4" />}
                className="!text-danger-400"
              >
                Recusar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => executar("alteracao_solicitada")}
                disabled={pending}
                iconLeft={<Pencil className="h-4 w-4" />}
              >
                Mudar
              </Button>
            </div>
          )}

          {/* se já está aprovada/rejeitada, mostra um botão para reabrir */}
          {showApproveActions &&
            !showFeedback &&
            (entrada.status === "aprovado" || entrada.status === "rejeitado") && (
              <div className="pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={() => executar("alteracao_solicitada")}
                  disabled={pending}
                  className="text-[11px] text-royal-300 hover:text-royal-200"
                >
                  Mudar de ideia? Pedir alteração →
                </button>
              </div>
            )}
        </div>
      )}
    </Card>
  );
}

// Preview da arte anexada: vídeo (player) ou imagem (thumbnail) ou link de download.
function MidiaPreview({ url }: { url: string }) {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const isVideo = ["mp4", "webm", "mov", "ogv", "m4v"].includes(ext);
  if (isVideo) {
    return (
      <div className="relative aspect-square rounded-md overflow-hidden border border-border bg-black/40">
        <video src={url} controls className="h-full w-full object-cover" />
        <span className="absolute top-1 left-1 inline-flex items-center gap-1 rounded bg-black/60 px-1 py-0.5 text-[9px] text-slate-200">
          <Film className="h-2.5 w-2.5" /> vídeo
        </span>
      </div>
    );
  }
  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "avif", "svg", "bmp"].includes(ext);
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block relative aspect-square rounded-md overflow-hidden border border-border bg-bg-elevated">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Arte do post" className="h-full w-full object-cover" loading="lazy" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-border bg-bg-elevated p-2 text-center"
    >
      <Paperclip className="h-4 w-4 text-slate-400" />
      <span className="text-[10px] text-slate-400 truncate w-full">arquivo.{ext}</span>
    </a>
  );
}
