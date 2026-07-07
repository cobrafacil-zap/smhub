"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { MONTHS_PT } from "@/lib/constants";

function adicionarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(ano, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PlanejamentoMesNav({
  basePath,
  tabKey,
  mesAtivo,
  mesesDisponiveis,
}: {
  basePath: string;
  tabKey: string;
  mesAtivo: string;
  mesesDisponiveis: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function irPara(mes: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("tab", tabKey);
    sp.set("mes", mes);
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  const [ano, m] = mesAtivo.split("-").map(Number);
  const label = `${MONTHS_PT[m - 1]} ${ano}`;
  const temPlanejamento = mesesDisponiveis.includes(mesAtivo);

  return (
    <div className="flex items-center gap-1.5 bg-bg-elevated/60 rounded-lg border border-border px-1.5 py-1">
      <button
        type="button"
        onClick={() => irPara(adicionarMes(mesAtivo, -1))}
        className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-bg-muted"
        title="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1.5 px-2 min-w-[120px] justify-center">
        <Calendar className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-sm font-medium text-slate-200 capitalize">{label}</span>
        {temPlanejamento && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Tem planejamento" />
        )}
      </div>
      <button
        type="button"
        onClick={() => irPara(adicionarMes(mesAtivo, 1))}
        className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-bg-muted"
        title="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
