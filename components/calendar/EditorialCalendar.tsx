"use client";

import { cn } from "@/lib/utils";
import { ENTRY_TIPO_LABEL } from "@/lib/constants";
import { MONTHS_PT, WEEKDAYS_PT } from "@/lib/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildMonthCells, type CalendarCell } from "@/lib/calendar";
import type { PlanejamentoEntrada } from "@/types/database";
import { useMemo, useState } from "react";

interface EditorialCalendarProps {
  /** Entradas do mês atual. */
  entries: PlanejamentoEntrada[];
  /** Data inicial (YYYY-MM-DD). */
  initialDate?: string;
  onMonthChange?: (year: number, month: number) => void;
  onCellClick?: (date: string) => void;
  onEntryClick?: (entry: PlanejamentoEntrada) => void;
  /** Quando true, oculta controles de admin (cliente). */
  readOnly?: boolean;
}

const tipoColors: Record<string, string> = {
  post_feed: "bg-royal-500/30 text-royal-200 border-royal-500/40",
  story: "bg-accent-500/30 text-accent-500 border-accent-500/40",
  reels: "bg-pink-500/30 text-pink-200 border-pink-500/40",
  carrossel: "bg-amber-500/30 text-amber-200 border-amber-500/40",
  video: "bg-success-500/30 text-success-400 border-success-500/40",
  artigo: "bg-slate-500/30 text-slate-200 border-slate-500/40",
};

export function EditorialCalendar({
  entries,
  initialDate,
  onMonthChange,
  onCellClick,
  onEntryClick,
  readOnly = false,
}: EditorialCalendarProps) {
  const [refDate, setRefDate] = useState(() => {
    if (initialDate) {
      const [y, m] = initialDate.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const year = refDate.getFullYear();
  const month = refDate.getMonth() + 1;
  const cells: CalendarCell[] = useMemo(
    () => buildMonthCells(year, month, entries),
    [year, month, entries]
  );

  function changeMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setRefDate(next);
    onMonthChange?.(next.getFullYear(), next.getMonth() + 1);
  }

  return (
    <div className="card !p-3 lg:!p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-100 capitalize">
          {MONTHS_PT[month - 1]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => changeMonth(-1)}
            iconLeft={<ChevronLeft className="h-4 w-4" />}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const now = new Date();
              setRefDate(now);
              onMonthChange?.(now.getFullYear(), now.getMonth() + 1);
            }}
          >
            Hoje
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => changeMonth(1)}
            iconRight={<ChevronRight className="h-4 w-4" />}
          >
            Próximo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_PT.map((w) => (
          <div
            key={w}
            className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 py-1"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => (
          <button
            type="button"
            key={cell.date}
            onClick={() => onCellClick?.(cell.date)}
            className={cn(
              "min-h-[88px] text-left p-1.5 rounded-md border transition group",
              cell.isCurrentMonth
                ? "bg-bg-elevated/40 border-border hover:border-royal-500/50"
                : "bg-transparent border-transparent text-slate-600",
              cell.isToday && "ring-1 ring-royal-500/60"
            )}
          >
            <div
              className={cn(
                "text-xs font-semibold mb-1",
                cell.isToday ? "text-royal-300" : "text-slate-400"
              )}
            >
              {cell.day}
            </div>
            <div className="space-y-0.5">
              {cell.entries.slice(0, 3).map((e) => {
                const corEstilo = e.cor
                  ? { borderLeft: `4px solid ${e.cor}`, backgroundColor: `${e.cor}22`, color: "#e2e8f0" }
                  : undefined;
                return (
                  <div
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEntryClick?.(e);
                    }}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer",
                      !e.cor && (tipoColors[e.tipo] ?? tipoColors.post_feed)
                    )}
                    style={corEstilo}
                    title={e.titulo}
                  >
                    {ENTRY_TIPO_LABEL[e.tipo] ?? e.tipo}: {e.titulo}
                    {e.estilo && <span className="opacity-70"> · {e.estilo}</span>}
                  </div>
                );
              })}
              {cell.entries.length > 3 && (
                <div className="text-[10px] text-slate-500">+{cell.entries.length - 3}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
