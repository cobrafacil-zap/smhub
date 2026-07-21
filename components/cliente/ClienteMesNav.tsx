"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS_PT } from "@/lib/constants";

function adicionarMes(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Seletor de mês (Anterior/Hoje/Próximo) que escopa a home do cliente via ?mes=YYYY-MM. */
export function ClienteMesNav({ mesAtivo }: { mesAtivo: string }) {
  const router = useRouter();
  const [y, m] = mesAtivo.split("-").map(Number);
  const label = `${MONTHS_PT[m - 1]} ${y}`;
  const hoje = mesAtual();

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-lg font-semibold text-slate-100 capitalize">{label}</p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => router.push(`/cliente?mes=${adicionarMes(mesAtivo, -1)}`, { scroll: false })}
          iconLeft={<ChevronLeft className="h-4 w-4" />}
        >
          Anterior
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => router.push(`/cliente?mes=${hoje}`, { scroll: false })}
        >
          Hoje
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => router.push(`/cliente?mes=${adicionarMes(mesAtivo, 1)}`, { scroll: false })}
          iconRight={<ChevronRight className="h-4 w-4" />}
        >
          Próximo
        </Button>
      </div>
    </div>
  );
}