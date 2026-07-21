import { MONTHS_PT, WEEKDAYS_PT } from "@/lib/constants";
import type { PlanejamentoEntrada } from "@/types/database";

export type CalendarCell<E = PlanejamentoEntrada> = {
  /** Data no formato YYYY-MM-DD (local). */
  date: string;
  /** Dia do mês (1-31). */
  day: number;
  /** Dia da semana (0=Dom..6=Sáb) — útil p/ tintar dias de postagem. */
  weekday: number;
  /** Se pertence ao mês/ano que está sendo visualizado. */
  isCurrentMonth: boolean;
  /** Se é o dia de hoje. */
  isToday: boolean;
  /** Entradas agendadas neste dia. */
  entries: E[];
};

/** Formata Date → YYYY-MM-DD no fuso local. */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Constrói 42 células (6 semanas) do mês começando no domingo.
 * Genérica sobre qualquer entrada com campo `data` (YYYY-MM-DD).
 */
export function buildMonthCells<E extends { data: string }>(
  year: number,
  month: number,
  entries: E[]
): CalendarCell<E>[] {
  const cells: CalendarCell<E>[] = [];
  const todayStr = formatDate(new Date());

  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay(); // 0=Dom

  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstWeekday);

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    cells.push({
      date: dateStr,
      day: d.getDate(),
      weekday: d.getDay(),
      isCurrentMonth: d.getMonth() === month - 1 && d.getFullYear() === year,
      isToday: dateStr === todayStr,
      entries: entries.filter((e) => e.data === dateStr),
    });
  }
  return cells;
}

/** Data por extenso em PT-BR. Ex: "Terça-feira, 02 de junho". */
export function formatLongDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dObj = new Date(y, m - 1, d);
  const weekday = WEEKDAYS_PT[dObj.getDay()];
  const month = MONTHS_PT[m - 1];
  const day = String(d).padStart(2, "0");
  return `${weekday}, ${day} de ${month}`;
}
