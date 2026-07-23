"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { faixaPrazo, ORDEM_FAIXA, type Periodo } from "@/lib/planejamento";

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

/**
 * Devolve um YYYY-MM-DD "representante" da faixa de prazo, usado para
 * posicionar a navegação do período (não muda o filtro do quadro — o kanban
 * continua mostrando a janela de 2 semanas independente do `ref`).
 *
 * - "Atrasado" / "Hoje" / "Amanhã" → exatamente o dia da faixa
 * - "Esta semana" → segunda desta semana
 * - "Próxima semana" → segunda da próxima
 * - "Depois" → daqui 21 dias (entra na janela de 2 semanas como "Esta semana")
 * - "Sem data" → não tem data representativa; usa hoje (atalho fica igual a "Hoje")
 */
function refParaFaixa(faixa: string, hoje: Date): string {
  const ref = new Date(hoje);
  ref.setHours(0, 0, 0, 0);

  switch (faixa) {
    case "Atrasado":
      return toIso(new Date(ref.getTime() - 3 * 86400000));
    case "Hoje":
      return toIso(ref);
    case "Amanhã":
      return toIso(new Date(ref.getTime() + 86400000));
    case "Esta semana": {
      const offsetToMonday = (ref.getDay() + 6) % 7;
      const monday = new Date(ref);
      monday.setDate(ref.getDate() - offsetToMonday);
      return toIso(monday);
    }
    case "Próxima semana": {
      const offsetToMonday = (ref.getDay() + 6) % 7;
      const monday = new Date(ref);
      monday.setDate(ref.getDate() - offsetToMonday + 7);
      return toIso(monday);
    }
    case "Depois":
      return toIso(new Date(ref.getTime() + 21 * 86400000));
    case "Sem data":
    default:
      return toIso(ref);
  }
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
  const hoje = new Date();

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
  function irParaFaixa(faixa: string) {
    navegar(periodo, refParaFaixa(faixa, hoje));
  }

  // Faixa atualmente "ativa" = aquela que contém o ref atual. Usada só para
  // destacar a pílula correspondente. "Sem data" nunca fica ativa (ref é uma
  // data real, sempre cai em alguma faixa temporal).
  const faixaAtiva = faixaPrazo(refIso, hoje);

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
      </div>

      {/* Atalhos de faixa de prazo — clicar leva o `ref` para uma data dentro
          da faixa. O quadro (kanban) não é filtrado por isso; ele continua
          mostrando a janela de 2 semanas. A pílula ativa reflete a faixa em
          que o `ref` atual cai. */}
      <div className="flex flex-wrap items-center gap-1">
        {ORDEM_FAIXA.map((faixa) => {
          const ativa = faixa === faixaAtiva;
          return (
            <button
              key={faixa}
              type="button"
              onClick={() => irParaFaixa(faixa)}
              title={`Ir para ${faixa.toLowerCase()}`}
              className={cn(
                "text-xs rounded-md px-2 py-1 border transition",
                ativa
                  ? "bg-royal-500/15 text-royal-200 border-royal-500/40"
                  : "text-slate-300 border-border hover:bg-bg-elevated hover:text-slate-100"
              )}
            >
              {faixa}
            </button>
          );
        })}
      </div>
    </div>
  );
}