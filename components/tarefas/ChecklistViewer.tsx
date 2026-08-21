"use client";

import { useState, useTransition } from "react";
import { CheckSquare, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleChecklistItemAction } from "@/lib/actions/tarefa-checklist-actions";

export type ChecklistViewerItem = {
  id: string;
  texto: string;
  concluido: boolean;
};
export type ChecklistViewerBloco = {
  id: string;
  nome: string;
  itens: ChecklistViewerItem[];
};

export function ChecklistViewer({
  checklists,
}: {
  checklists: ChecklistViewerBloco[];
}) {
  if (!checklists || checklists.length === 0) return null;

  return (
    <div className="space-y-3">
      {checklists.map((c) => (
        <Bloco key={c.id} checklist={c} />
      ))}
    </div>
  );
}

function Bloco({ checklist }: { checklist: ChecklistViewerBloco }) {
  const [expandido, setExpandido] = useState(true);
  const [itens, setItens] = useState(checklist.itens);
  const [, startTransition] = useTransition();

  const total = itens.length;
  const concluidos = itens.filter((i) => i.concluido).length;
  const pct = total === 0 ? 0 : Math.round((concluidos / total) * 100);

  function toggle(id: string) {
    const atual = itens.find((i) => i.id === id);
    if (!atual) return;
    const novo = !atual.concluido;
    // Otimista
    setItens(itens.map((i) => (i.id === id ? { ...i, concluido: novo } : i)));
    startTransition(async () => {
      const res = await toggleChecklistItemAction(id, novo);
      if (res?.error) {
        // reverte
        setItens(itens.map((i) => (i.id === id ? { ...i, concluido: !novo } : i)));
        alert(res.error);
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-bg-elevated/40 p-3 space-y-2">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex items-center gap-1.5 w-full text-left text-sm font-semibold text-slate-100"
      >
        {expandido ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" />
        )}
        <CheckSquare className="h-4 w-4 text-slate-400" />
        <span className="truncate">{checklist.nome}</span>
        <span className="ml-auto text-[10px] font-normal text-slate-500">
          {concluidos}/{total}
        </span>
      </button>

      {total > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-bg-muted overflow-hidden">
            <div
              className="h-full bg-success-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500">{pct}% concluído</p>
        </div>
      )}

      {expandido && (
        <ul className="space-y-0.5">
          {itens.map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-bg-muted transition"
            >
              <input
                type="checkbox"
                checked={i.concluido}
                onChange={() => toggle(i.id)}
                className="h-4 w-4 rounded border-border accent-success-500 shrink-0"
              />
              <span
                className={cn(
                  "flex-1 text-xs",
                  i.concluido
                    ? "line-through text-slate-500"
                    : "text-slate-200"
                )}
              >
                {i.texto}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}