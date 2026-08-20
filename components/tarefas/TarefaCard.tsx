"use client";

import { useState, useTransition, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, Archive, ArchiveRestore, CalendarClock, CalendarDays, MoreHorizontal, Package, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn, initials } from "@/lib/utils";
import { deletarTarefaAction, arquivarTarefaAction, alterarPrazoTarefaAction } from "@/lib/actions/tarefa-actions";
import type { TarefaItem } from "@/app/admin/tarefas/page";

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
    "from-royal-500 via-royal-550 to-royal-700",
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
  arrastando = false,
  onEdit,
  onView,
  onDragStart,
  onDragEnd,
}: {
  tarefa: TarefaItem;
  meuId: string;
  meuRole: string;
  arrastando?: boolean;
  onEdit: (t: TarefaItem) => void;
  onView: (t: TarefaItem) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const podeExcluir = tarefa.criado_por === meuId || meuRole === "admin_agencia";
  const podeEditar = meuRole === "admin_agencia";

  const tint = cardTint(tarefa.id);

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
    prazoDate && prazoDate < hoje && tarefa.coluna_slug !== "entregue";

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
        "card spotlight lift !p-2.5 space-y-2 transition cursor-pointer border-l-2",
        tint.bar,
        tint.bg,
        tarefa.arquivado && "opacity-60",
        pending && "opacity-50",
        arrastando && "opacity-40 ring-2 ring-royal-500/50",
        // hover/focus-within revela o menu de ações
        "group"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-left font-medium text-slate-100 line-clamp-2 select-none text-sm">
          {tarefa.titulo}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={PRIORIDADE_VARIANTE[tarefa.prioridade] ?? "default"}>
            {PRIORIDADE_LABEL[tarefa.prioridade] ?? tarefa.prioridade}
          </Badge>
          <CartaoMenu
            tarefa={tarefa}
            podeEditar={podeEditar}
            podeExcluir={podeExcluir}
            arquivado={tarefa.arquivado}
            onEdit={onEdit}
            onArquivar={arquivar}
            onExcluir={excluir}
          />
        </div>
      </div>

      {tarefa.descricao && (
        <p className="text-xs text-slate-400 line-clamp-2">{tarefa.descricao}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {tarefa.grupo_nome && (
          <span
            className="text-[10px] text-royal-300 bg-royal-500/10 border border-royal-500/30 rounded px-1.5 py-0.5 inline-flex items-center gap-1 max-w-full"
            title={`Agrupamento: ${tarefa.grupo_nome}`}
          >
            <Package className="h-3 w-3 shrink-0" />
            <span className="truncate">{tarefa.grupo_nome}</span>
          </span>
        )}
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
          <span
            className={cn(
              "text-[10px] rounded px-1.5 py-0.5 inline-flex items-center gap-1 border",
              tarefa.coluna_slug === "entregue"
                ? "text-success-400 bg-success-500/10 border-success-500/30"
                : "text-slate-400 bg-bg-elevated border-border"
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {new Date(tarefa.prazo + "T00:00:00").toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        {/* Responsáveis (avatars) */}
        {tarefa.responsaveis.length > 0 ? (
          <div className="flex -space-x-1.5">
            {tarefa.responsaveis.map((r) => (
              <div
                key={r.id}
                title={r.nome}
                className={cn(
                  "h-6 w-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-semibold border-2 border-bg-surface",
                  avatarColor(r.nome)
                )}
              >
                {initials(r.nome)}
              </div>
            ))}
          </div>
        ) : (
          <span />
        )}

        {/* Mudar prazo rápido — ação discreta no rodapé do card */}
        <div onClick={stop} onMouseDown={stop} className="ml-auto">
          <PrazoDropdown prazo={tarefa.prazo} onChange={mudarPrazo} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MENU DE AÇÕES DO CARD (⋯ no hover)
//
// Aparece sempre visível no canto do card (UX desktop) e também no mobile
// via focus-within. Contém Editar / Arquivar / Excluir (este último só pra
// criador ou admin).
// ============================================================================
function CartaoMenu({
  tarefa,
  podeEditar,
  podeExcluir,
  arquivado,
  onEdit,
  onArquivar,
  onExcluir,
}: {
  tarefa: TarefaItem;
  podeEditar: boolean;
  podeExcluir: boolean;
  arquivado: boolean;
  onEdit: (t: TarefaItem) => void;
  onArquivar: (a: boolean) => void;
  onExcluir: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    // posiciona à direita do botão, alinhado pela base
    setPos({ top: rect.bottom + 4, left: rect.right - 192 });
  }, [open]);

  // Fecha ao clicar fora do menu
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        btnRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        draggable={false}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="h-6 w-6 inline-flex items-center justify-center rounded text-slate-400 hover:text-royal-200 hover:bg-bg-elevated opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
        title="Ações do card"
        aria-label="Ações do card"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 w-48 rounded-xl border border-border bg-bg-surface shadow-[0_16px_50px_-10px_rgba(0,0,0,0.5)] py-1 overflow-hidden"
            style={{ top: pos.top, left: pos.left }}
          >
            {podeEditar && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onEdit(tarefa);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-bg-muted inline-flex items-center gap-2"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onArquivar(!arquivado);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-bg-muted inline-flex items-center gap-2"
            >
              {arquivado ? (
                <>
                  <ArchiveRestore className="h-3.5 w-3.5" /> Desarquivar
                </>
              ) : (
                <>
                  <Archive className="h-3.5 w-3.5" /> Arquivar
                </>
              )}
            </button>
            {podeExcluir && (
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-danger-400 hover:bg-bg-muted inline-flex items-center gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                }
                title="Excluir tarefa"
                description={`Excluir "${tarefa.titulo}"? Esta ação não pode ser desfeita.`}
                confirmText="Excluir"
                variant="danger"
                onConfirm={onExcluir}
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
}

function PrazoDropdown({ prazo, onChange }: { prazo: string | null; onChange: (p: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.right - 144 });
  }, [open]);

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
        className="text-[11px] text-slate-200 hover:text-white inline-flex items-center gap-1 py-0.5 px-1.5 -ml-1.5 rounded-md hover:bg-bg-elevated transition"
        title="Mudar prazo"
      >
        <CalendarDays className="h-3.5 w-3.5" /> {ativo}
      </button>
      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              className="fixed z-50 w-36 rounded-xl border border-border bg-bg-surface shadow-[0_16px_50px_-10px_rgba(0,0,0,0.5)] py-1.5 overflow-hidden"
              style={{ top: pos.top, left: pos.left }}
            >
              {opcoes.map((o) => {
                const ativo = o.value === prazo;
                return (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => {
                      onChange(ativo ? null : o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-sm font-medium transition flex items-center justify-between gap-2",
                      ativo
                        ? "text-royal-300 bg-royal-500/10"
                        : "text-slate-200 hover:bg-bg-muted hover:text-white"
                    )}
                  >
                    <span>{o.label}</span>
                    {ativo && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )
      }
    </div>
  );
}
