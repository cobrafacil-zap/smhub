"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Periodo } from "@/lib/planejamento";

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Soma dias a um YYYY-MM-DD. */
function addDays(iso: string, dias: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return toIso(d);
}

/** Soma meses a um YYYY-MM-DD, mantendo no dia 1 pra não estourar meses curtos. */
function addMonths(iso: string, meses: number): string {
  const d = new Date(iso + "T00:00:00");
  return toIso(new Date(d.getFullYear(), d.getMonth() + meses, 1));
}

export function TarefasPeriodoNav({
  periodo,
  refIso,
  label,
}: {
  periodo: Periodo;
  refIso: string;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navegar(novoPeriodo: Periodo, novoRef: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", novoPeriodo);
    params.set("ref", novoRef);
    router.push(`${pathname}?${params.toString()}`);
  }

  function trocarPeriodo(novo: Periodo) {
    navegar(novo, refIso);
  }

  function anterior() {
    navegar(periodo, periodo === "semana" ? addDays(refIso, -7) : addMonths(refIso, -1));
  }
  function proximo() {
    navegar(periodo, periodo === "semana" ? addDays(refIso, 7) : addMonths(refIso, 1));
  }
  function hoje() {
    navegar(periodo, toIso(new Date()));
  }

  return (
    <div className="card !p-3 flex flex-wrap items-center justify-between gap-3">
      {/* Alternar Semana / Mês */}
      <div className="inline-flex rounded-lg border border-border overflow-hidden">
        {(["semana", "mes"] as Periodo[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => trocarPeriodo(p)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition",
              periodo === p
                ? "bg-royal-500/15 text-royal-200"
                : "text-slate-400 hover:text-slate-200 hover:bg-bg-elevated"
            )}
          >
            {p === "semana" ? "Semana" : "Mês"}
          </button>
        ))}
      </div>

      {/* Navegação anterior / label / próximo */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={anterior}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-300 hover:bg-bg-elevated hover:text-slate-100 border border-border"
          title={periodo === "semana" ? "Semana anterior" : "Mês anterior"}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-slate-100 min-w-[140px] text-center capitalize">
          {label}
        </span>
        <button
          type="button"
          onClick={proximo}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-300 hover:bg-bg-elevated hover:text-slate-100 border border-border"
          title={periodo === "semana" ? "Próxima semana" : "Próximo mês"}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={hoje}
          className="ml-1 text-xs text-royal-300 hover:text-royal-200 border border-royal-500/30 rounded-md px-2 py-1"
        >
          Hoje
        </button>
      </div>
    </div>
  );
}