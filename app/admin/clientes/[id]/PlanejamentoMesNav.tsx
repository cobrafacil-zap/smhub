"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { Select } from "@/components/ui/Select";
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

  // Lista de opções:
  // 1) Mês atual + próximos 11 meses (janela de planejamento típico de 1 ano à frente).
  // 2) Meses passados que JÁ têm planejamento (pra conseguir voltar e revisar).
  // 3) Meses futuros fora da janela de 12 meses que JÁ têm planejamento (raro, mas pode).
  // Ordena cronologicamente. Marca com pontinho verde os meses com planejamento.
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  const janelasFuturas = Array.from({ length: 12 }, (_, i) => adicionarMes(mesAtual, i));
  const mesesPassadosComPlan = mesesDisponiveis
    .filter((m) => m < mesAtual)
    .filter((m) => !janelasFuturas.includes(m));
  const opcoes = [...mesesPassadosComPlan, ...janelasFuturas].sort();

  return (
    <div className="flex items-center gap-1.5 bg-bg-elevated/60 rounded-lg border border-border px-1.5 py-1">
      <Calendar className="h-3.5 w-3.5 text-slate-500 ml-1.5" />
      <Select
        className="!bg-transparent !border-0 !text-sm !font-medium !text-slate-200 !capitalize !py-1 !pl-1 !pr-9 cursor-pointer hover:!text-royal-200 transition focus:!ring-0"
        value={mesAtivo}
        onChange={(e) => irPara(e.target.value)}
      >
        {opcoes.map((m) => {
          const [ano, mm] = m.split("-").map(Number);
          const label = `${MONTHS_PT[mm - 1]} ${ano}`;
          const temPlan = mesesDisponiveis.includes(m);
          return (
            <option key={m} value={m}>
              {label}
              {temPlan ? "  •" : ""}
            </option>
          );
        })}
      </Select>
      {mesesDisponiveis.includes(mesAtivo) && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1"
          title="Tem planejamento"
        />
      )}
    </div>
  );
}
