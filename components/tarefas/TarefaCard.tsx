"use client";

import { useTransition } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Archive, ArchiveRestore, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn, initials } from "@/lib/utils";
import { moverTarefaAction, deletarTarefaAction, arquivarTarefaAction } from "@/lib/actions/tarefa-actions";
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

export function TarefaCard({
  tarefa,
  meuId,
  meuRole,
  onEdit,
}: {
  tarefa: TarefaItem;
  meuId: string;
  meuRole: string;
  onEdit: (t: TarefaItem) => void;
}) {
  const [pending, startTransition] = useTransition();
  const podeExcluir = tarefa.criado_por === meuId || meuRole === "admin_agencia";
  const podeEditar = meuRole === "admin_agencia";

  const idx = STATUS_ORDEM.indexOf(tarefa.status as (typeof STATUS_ORDEM)[number]);
  const podeEsquerda = idx > 0;
  const podeDireita = idx < STATUS_ORDEM.length - 1;

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

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazoDate = tarefa.prazo ? new Date(tarefa.prazo + "T00:00:00") : null;
  const vencido =
    prazoDate && prazoDate < hoje && tarefa.status !== "entregue";

  return (
    <div
      className={cn(
        "card !p-3 space-y-2 transition",
        tarefa.arquivado && "opacity-60",
        pending && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {podeEditar ? (
          <button
            type="button"
            onClick={() => onEdit(tarefa)}
            className="text-left text-sm font-medium text-slate-100 hover:text-royal-200 line-clamp-2"
          >
            {tarefa.titulo}
          </button>
        ) : (
          <p className="text-left text-sm font-medium text-slate-100 line-clamp-2">
            {tarefa.titulo}
          </p>
        )}
        <Badge variant={PRIORIDADE_VARIANTE[tarefa.prioridade] ?? "default"} className="shrink-0">
          {PRIORIDADE_LABEL[tarefa.prioridade] ?? tarefa.prioridade}
        </Badge>
      </div>

      {tarefa.descricao && (
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
                "h-6 w-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-semibold border-2 border-bg-surface",
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
          disabled={!podeEsquerda || pending}
          onClick={() => mover(STATUS_ORDEM[idx - 1])}
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
          disabled={!podeDireita || pending}
          onClick={() => mover(STATUS_ORDEM[idx + 1])}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-bg-elevated hover:text-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Mover para a próxima coluna"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-1">
        {podeEditar && (
          <button
            type="button"
            onClick={() => onEdit(tarefa)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-bg-elevated hover:text-slate-100"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => arquivar(!tarefa.arquivado)}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-bg-elevated hover:text-slate-100"
          title={tarefa.arquivado ? "Desarquivar" : "Arquivar"}
        >
          {tarefa.arquivado ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </button>
        {podeExcluir && (
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
        )}
      </div>
    </div>
  );
}