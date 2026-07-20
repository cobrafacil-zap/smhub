"use client";

import { cn } from "@/lib/utils";
import { ENTRY_TIPO_LABEL, ENTRY_TIPO_COR } from "@/lib/constants";
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
  /** Dia selecionado/fixo (YYYY-MM-DD) — destacado no calendário. */
  selectedDate?: string;
  /** Dias da semana marcados como "dia de postagem" (0=Dom..6=Sáb). Tingem o grid. */
  diasPostagem?: number[] | null;
}

export function EditorialCalendar({
  entries,
  initialDate,
  onMonthChange,
  onCellClick,
  onEntryClick,
  readOnly = false,
  selectedDate,
  diasPostagem,
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

  // Dias da semana marcados como dia de postagem (índice = getDay: 0=Dom..6=Sáb,
  // mesma ordem de WEEKDAYS_PT). Usado p/ tingir sutilmente o grid.
  const diasSet = useMemo(
    () => new Set((diasPostagem ?? []).map(Number)),
    [diasPostagem]
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
        {WEEKDAYS_PT.map((w, i) => (
          <div
            key={w}
            className={cn(
              "text-center text-[10px] font-semibold uppercase tracking-wider py-1",
              diasSet.has(i) ? "text-royal-300" : "text-slate-500"
            )}
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
              // Dia de postagem: tinta sutil (royal /10) p/ diferenciar sem destacar demais.
              diasSet.has(cell.weekday) &&
                cell.isCurrentMonth &&
                "bg-royal-500/10 border-royal-500/20",
              cell.isToday && "ring-1 ring-royal-500/60",
              selectedDate === cell.date && "border-royal-500 ring-2 ring-royal-500/50"
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
                // Cor fixa por tipo — não usa mais e.cor (coluna legada, ignorada).
                const cor = ENTRY_TIPO_COR[e.tipo] ?? ENTRY_TIPO_COR.post_feed;
                return (
                  <div
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEntryClick?.(e);
                    }}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer",
                      cor.chip
                    )}
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
