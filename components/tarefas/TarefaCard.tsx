"use client";

import { useState, useTransition, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Archive, ArchiveRestore, CalendarClock, CalendarDays, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn, initials } from "@/lib/utils";
import { moverTarefaAction, deletarTarefaAction, arquivarTarefaAction, alterarPrazoTarefaAction } from "@/lib/actions/tarefa-actions";
import type { TarefaItem } from "@/app/admin/tarefas/page";

const STATUS_LABEL: Record<string, string> = {
  destinada: "Tarefa destinada",
  em_andamento: "Em andamento",
  pronta: "Pronta",
  entregue: "Entregue",
};
const STATUS_ORDEM = ["destinada", "em_andamento", "pronta", "entregue"] as const;

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

// Tintes sutis por card (barra lateral + fundo bem leve) pra diferenciar visual.
const CARD_TINTS = [
  { bar: "border-l-royal-500/70", bg: "bg-royal-500/[0.06]" },
  { bar: "border-l-emerald-500/70", bg: "bg-emerald-500/[0.06]" },
  { bar: "border-l-amber-500/70", bg: "bg-amber-500/[0.06]" },
  { bar: "border-l-pink-500/70", bg: "bg-pink-500/[0.06]" },
  { bar: "border-l-sky-500/70", bg: "bg-sky-500/[0.06]" },
  { bar: "border-l-violet-500/70", bg: "bg-violet-500/[0.06]" },
];
function cardTint(chave: string) {
  let h = 0;
  for (let i = 0; i < chave.length; i++) h = (h * 31 + chave.charCodeAt(i)) >>> 0;
  return CARD_TINTS[h % CARD_TINTS.length];
}

export function TarefaCard({
  tarefa,
  meuId,
  meuRole,
  nivel = "normal",
  arrastando = false,
  onEdit,
  onView,
  onDragStart,
  onDragEnd,
}: {
  tarefa: TarefaItem;
  meuId: string;
  meuRole: string;
  /** Densidade do card conforme a quantidade na coluna. */
  nivel?: "normal" | "compacto" | "minimo";
  arrastando?: boolean;
  onEdit: (t: TarefaItem) => void;
  onView: (t: TarefaItem) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const podeExcluir = tarefa.criado_por === meuId || meuRole === "admin_agencia";
  const podeEditar = meuRole === "admin_agencia";

  const idx = STATUS_ORDEM.indexOf(tarefa.status as (typeof STATUS_ORDEM)[number]);
  const podeEsquerda = idx > 0;
  const podeDireita = idx < STATUS_ORDEM.length - 1;

  // Classes por densidade (muitos cards numa coluna -> encolhe).
  const pad = nivel === "minimo" ? "!p-2" : nivel === "compacto" ? "!p-2.5" : "!p-3";
  const tituloClasse =
    nivel === "minimo" ? "text-xs" : nivel === "compacto" ? "text-[13px]" : "text-sm";
  const mostrarDescricao = nivel !== "minimo";

  // Cor sutil por card (determinística pelo id) pra diferenciar visual.
  const tint = cardTint(tarefa.id);

  function mover(novaStatus: string) {
    startTransition(async () => {
      await moverTarefaAction(tarefa.id, novaStatus);
    });
  }

  function arquivar(arquivado: boolean) {
    startTransition(async () => {
      await arquivarTarefaAction(tarefa.id, arquivado);
    });
  }

  function excluir() {
    startTransition(async () => {
      await deletarTarefaAction(tarefa.id);
    });
  }

  function mudarPrazo(novoPrazo: string | null) {
    startTransition(async () => {
      await alterarPrazoTarefaAction(tarefa.id, novoPrazo);
    });
  }

  // Botões internos não abrem o detalhe nem iniciam drag do card.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazoDate = tarefa.prazo ? new Date(tarefa.prazo + "T00:00:00") : null;
  const vencido =
    prazoDate && prazoDate < hoje && tarefa.status !== "entregue";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", tarefa.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onClick={() => onView(tarefa)}
      className={cn(
        "card spotlight lift space-y-2 transition cursor-pointer hover:border-royal-500/40 border-l-2",
        pad,
        tint.bar,
        tint.bg,
        tarefa.arquivado && "opacity-60",
        pending && "opacity-50",
        arrastando && "opacity-40 ring-2 ring-royal-500/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-left font-medium text-slate-100 line-clamp-2 select-none",
            tituloClasse
          )}
          title="Ver detalhes"
        >
          {tarefa.titulo}
        </p>
        <Badge variant={PRIORIDADE_VARIANTE[tarefa.prioridade] ?? "default"} className="shrink-0">
          {PRIORIDADE_LABEL[tarefa.prioridade] ?? tarefa.prioridade}
        </Badge>
      </div>

      {mostrarDescricao && tarefa.descricao && (
        <p className="text-xs text-slate-400 line-clamp-2">{tarefa.descricao}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {tarefa.cliente_nome && (
          <span className="text-[10px] text-slate-400 bg-bg-elevated border border-border rounded px-1.5 py-0.5">
            {tarefa.cliente_nome}
          </span>
        )}
        {vencido && (
          <span className="text-[10px] text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" /> Vencido
          </span>
        )}
        {!vencido && tarefa.prazo && (
          <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {new Date(tarefa.prazo + "T00:00:00").toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      {/* Responsáveis (avatars) */}
      {tarefa.responsaveis.length > 0 && (
        <div className="flex -space-x-1.5">
          {tarefa.responsaveis.map((r) => (
            <div
              key={r.id}
              title={r.nome}
              className={cn(
                "rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-semibold border-2 border-bg-surface",
                nivel === "minimo" ? "h-5 w-5" : "h-6 w-6",
                avatarColor(r.nome)
              )}
            >
              {initials(r.nome)}
            </div>
          ))}
        </div>
      )}

      {/* Mover entre colunas */}
      <div className="flex items-center gap-1 pt-1.5 border-t border-border">
        <button
          type="button"
          draggable={false}
          disabled={!podeEsquerda || pending}
          onClick={(e) => {
            stop(e);
            mover(STATUS_ORDEM[idx - 1]);
          }}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-bg-elevated hover:text-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Mover para a coluna anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[11px] text-slate-400 flex-1 text-center">
          {STATUS_LABEL[tarefa.status]}
        </span>
        <button
          type="button"
          draggable={false}
          disabled={!podeDireita || pending}
          onClick={(e) => {
            stop(e);
            mover(STATUS_ORDEM[idx + 1]);
          }}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-bg-elevated hover:text-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Mover para a próxima coluna"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Mudar prazo rápido */}
      <div onClick={stop} onMouseDown={stop}>
        <PrazoDropdown prazo={tarefa.prazo} onChange={mudarPrazo} />
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-1">
        {podeEditar && (
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              stop(e);
              onEdit(tarefa);
            }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-bg-elevated hover:text-slate-100"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          draggable={false}
          disabled={pending}
          onClick={(e) => {
            stop(e);
            arquivar(!tarefa.arquivado);
          }}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-bg-elevated hover:text-slate-100"
          title={tarefa.arquivado ? "Desarquivar" : "Arquivar"}
        >
          {tarefa.arquivado ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </button>
        {podeExcluir && (
          <span onClick={stop} className="inline-flex">
            <ConfirmDialog
              trigger={
                <span
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-danger-400 hover:bg-danger-500/10 cursor-pointer"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              }
              title="Excluir tarefa"
              description={`Excluir "${tarefa.titulo}"? Esta ação não pode ser desfeita.`}
              confirmText="Excluir"
              variant="danger"
              onConfirm={excluir}
            />
          </span>
        )}
      </div>
    </div>
  );
}

function PrazoDropdown({ prazo, onChange }: { prazo: string | null; onChange: (p: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  // Handle do setTimeout pendente de fechar o menu após um clique. Cancelado
  // se o navegador detectar duplo-clique antes do timeout (400ms) expirar.
  // 400ms é o limite típico de double-click em sistemas desktop — abaixo do
  // limite, o segundo clique é consumido pelo timeout antes do navegador
  // disparar o dblclick.
  const pendingClose = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  }, [open]);

  // Limpa timeout pendente se o componente desmontar.
  useEffect(() => {
    return () => {
      if (pendingClose.current) clearTimeout(pendingClose.current);
    };
  }, []);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const add = (dias: number) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + dias);
    return fmt(d);
  };

  const opcoes = [
    { label: "Hoje", value: add(0) },
    { label: "Amanhã", value: add(1) },
    { label: "+2 dias", value: add(2) },
    { label: "+3 dias", value: add(3) },
    { label: "+7 dias", value: add(7) },
  ];

  // Tarefas antigas (criadas antes da remoção de "Sem data") ainda podem ter
  // prazo = null. Prazos definidos por outro caminho (ex: TarefaDialog com
  // data que não está nas opções rápidas) também caem aqui. Em ambos os
  // casos, mostra "Prazo" como rótulo neutro.
  const ativo = opcoes.find((o) => o.value === prazo)?.label ?? "Prazo";

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="text-[11px] text-slate-200 hover:text-white inline-flex items-center gap-1 py-1 px-1.5 -ml-1.5 rounded-md hover:bg-bg-elevated transition"
        title="Mudar prazo"
      >
        <CalendarDays className="h-3.5 w-3.5" /> {ativo}
      </button>
      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                if (pendingClose.current) {
                  clearTimeout(pendingClose.current);
                  pendingClose.current = null;
                }
                setOpen(false);
              }}
              aria-hidden="true"
            />
            <div
              className="fixed z-50 w-36 rounded-xl border border-border bg-bg-surface shadow-[0_16px_50px_-10px_rgba(0,0,0,0.5)] py-1.5 overflow-hidden"
              style={{ top: pos.top, left: pos.left }}
            >
              {opcoes.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => {
                    // Adia o fechamento em 400ms para o navegador ter chance
                    // de detectar duplo-clique. Se não houver segundo clique,
                    // o timeout fecha o menu. Se houver, o onDoubleClick
                    // cancela e limpa o prazo.
                    if (pendingClose.current) clearTimeout(pendingClose.current);
                    pendingClose.current = setTimeout(() => {
                      pendingClose.current = null;
                      setOpen(false);
                    }, 400);
                    onChange(o.value);
                  }}
                  onDoubleClick={(e) => {
                    if (o.value === prazo) {
                      e.stopPropagation();
                      e.preventDefault();
                      if (pendingClose.current) {
                        clearTimeout(pendingClose.current);
                        pendingClose.current = null;
                      }
                      onChange(null);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-sm font-medium transition flex items-center justify-between gap-2",
                    o.value === prazo
                      ? "text-royal-300 bg-royal-500/10"
                      : "text-slate-200 hover:bg-bg-muted hover:text-white"
                  )}
                >
                  <span>{o.label}</span>
                  {o.value === prazo && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}
            </div>
          </>,
          document.body
        )
      }
    </div>
  );
}