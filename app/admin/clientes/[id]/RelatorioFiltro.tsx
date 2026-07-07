"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Filter } from "lucide-react";

export function RelatorioFiltro({
  basePath,
  tabKey,
  mesAtual,
}: {
  basePath: string;
  tabKey: string;
  mesAtual: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mes, setMes] = useState(mesAtual);
  const [, startTransition] = useTransition();

  function aplicar(e?: React.FormEvent) {
    e?.preventDefault();
    const sp = new URLSearchParams(params.toString());
    sp.set("tab", tabKey);
    if (mes) sp.set("mes", mes);
    else sp.delete("mes");
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  function limpar() {
    const sp = new URLSearchParams(params.toString());
    sp.set("tab", tabKey);
    sp.delete("mes");
    setMes("");
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  return (
    <Card>
      <form onSubmit={aplicar} className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-royal-500/20 flex items-center justify-center">
            <Filter className="h-4 w-4 text-royal-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Filtrar por mês</p>
            <p className="text-xs text-slate-500">Veja relatórios de um período específico.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="input text-sm flex-1"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-secondary h-[36px] text-xs"
          >
            Aplicar
          </button>
          {mesAtual && (
            <button
              type="button"
              onClick={limpar}
              className="btn btn-ghost h-[36px] text-xs"
            >
              Limpar
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
