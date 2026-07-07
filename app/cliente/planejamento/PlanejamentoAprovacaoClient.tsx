"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EditorialCalendar } from "@/components/calendar/EditorialCalendar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, CalendarDays, MessageCircle } from "lucide-react";
import { formatLongDate, buildMonthCells } from "@/lib/calendar";
import { MONTHS_PT } from "@/lib/constants";
import { EntradaAprovacaoCard } from "./EntradaAprovacaoCard";
import type { PlanejamentoEntrada } from "@/types/database";

interface Props {
  entradas: PlanejamentoEntrada[];
  initialDate: string; // YYYY-MM-DD
}

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseIso(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function PlanejamentoAprovacaoClient({ entradas, initialDate }: Props) {
  const router = useRouter();
  const [refDate, setRefDate] = useState(() => parseIso(initialDate));
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const year = refDate.getFullYear();
  const month = refDate.getMonth() + 1;
  const monthLabel = `${MONTHS_PT[month - 1]} ${year}`;

  // agrupa entradas por dia (YYYY-MM-DD)
  const porDia = useMemo(() => {
    const map = new Map<string, PlanejamentoEntrada[]>();
    for (const e of entradas) {
      const list = map.get(e.data) ?? [];
      list.push(e);
      map.set(e.data, list);
    }
    return Array.from(map.entries())
      .map(([data, list]) => ({ data, entradas: list.sort((a, b) => a.titulo.localeCompare(b.titulo)) }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [entradas]);

  // células do mês para o EditorialCalendar (readOnly)
  const cells = useMemo(() => buildMonthCells(year, month, entradas), [year, month, entradas]);

  function changeMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setRefDate(next);
    const ym = ymKey(next);
    router.push(`/cliente/planejamento?mes=${ym}`, { scroll: false });
  }

  function goToday() {
    const now = new Date();
    setRefDate(new Date(now.getFullYear(), now.getMonth(), 1));
    router.push(`/cliente/planejamento?mes=${ymKey(now)}`, { scroll: false });
  }

  // contadores para o resumo
  const contadores = useMemo(() => {
    const acc = { pendente: 0, aprovado: 0, rejeitado: 0, alteracao: 0 };
    for (const e of entradas) {
      if (e.status === "pendente") acc.pendente++;
      else if (e.status === "aprovado" || e.status === "publicado") acc.aprovado++;
      else if (e.status === "rejeitado") acc.rejeitado++;
      else if (e.status === "alteracao_solicitada") acc.alteracao++;
    }
    return acc;
  }, [entradas]);

  return (
    <div className="space-y-4">
      {/* header com navegação do mês */}
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-100 capitalize flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-royal-300" />
            {monthLabel}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {contadores.pendente} pendente{contadores.pendente !== 1 ? "s" : ""} •{" "}
            {contadores.aprovado} aprovado{contadores.aprovado !== 1 ? "s" : ""}
            {contadores.alteracao > 0 && (
              <>
                {" "}•{" "}
                <span className="text-warning-300">
                  {contadores.alteracao} com mudança solicitada
                </span>
              </>
            )}
          </p>
        </div>
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
          <Button type="button" variant="secondary" size="sm" onClick={goToday}>
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
      </Card>

      {entradas.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <MessageCircle className="h-10 w-10 mx-auto text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">
              Nenhum post programado para {monthLabel}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Quando a agência adicionar entradas neste mês, elas aparecerão aqui para sua aprovação.
            </p>
          </div>
        </Card>
      ) : isMobile ? (
        // MOBILE: lista cronológica por dia
        <div className="space-y-4">
          {porDia.map(({ data, entradas: lista }) => (
            <div key={data} className="space-y-2">
              <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-bg/95 backdrop-blur border-b border-border">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {formatLongDate(data)}
                </p>
              </div>
              {lista.map((e) => (
                <EntradaAprovacaoCard key={e.id} entrada={e} showApproveActions />
              ))}
            </div>
          ))}
        </div>
      ) : (
        // DESKTOP: 2 colunas (calendário à esquerda, cards à direita)
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3 order-2 lg:order-1">
            <p className="text-sm font-semibold text-slate-300">Cards para aprovação</p>
            {porDia.map(({ data, entradas: lista }) => (
              <div key={data} className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">
                  {formatLongDate(data)}
                </p>
                {lista.map((e) => (
                  <EntradaAprovacaoCard key={e.id} entrada={e} showApproveActions />
                ))}
              </div>
            ))}
          </div>
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="lg:sticky lg:top-4 space-y-2">
              <p className="text-sm font-semibold text-slate-300">Visão mensal</p>
              <EditorialCalendar entries={entradas} initialDate={initialDate} readOnly />
              <Card>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Legenda
                </p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-warning-400" /> Pendente
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-info-400" /> Aprovado
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success-400" /> Publicado
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-danger-400" /> Recusado
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
