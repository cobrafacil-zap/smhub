"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Calendar } from "lucide-react";

/**
 * Filtro do Financeiro: seleção LIVRE de meses (clica em jul, ago, set
 * individualmente — não é um bloco "3 meses") + caixinha "Só pago (realizado)".
 *
 * A URL carrega `?meses=2026-07,2026-08,2026-09&realizado=1`. A página
 * (server component) agrega saldo/receita/despesa de TODOS os meses
 * selecionados. `realizado=1` mostra só o que foi pago; ausente = previsão.
 *
 * Oferece uma janela rolante de 12 meses atrás + 6 à frente (18 opções),
 * ordenadas da mais recente pra mais antiga. O padrão é só o mês corrente.
 */
const MESES_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function ymKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function ymLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MESES_PT[m - 1]}/${String(y).slice(2)}`;
}

export function FiltroPeriodo({
  mesesInicial,
  realizadoInicial,
}: {
  mesesInicial: string[];
  realizadoInicial: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  // useSearchParams() pode vir vazio no SSR; os props (derivados dos
  // searchParams do server) servem de fallback pra hidratar certo.
  const mesesParam = params.get("meses");
  const meses = useMemo(() => {
    if (mesesParam) {
      const parsed = mesesParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^\d{4}-\d{2}$/.test(s));
      if (parsed.length) return parsed;
    }
    return mesesInicial;
  }, [mesesParam, mesesInicial]);
  const realizado = params.get("realizado") === "1" || realizadoInicial;

  // Janela de opções: 12 meses atrás + 6 à frente, da mais recente pra antiga.
  const opcoes = useMemo(() => {
    const hoje = new Date();
    const lista: string[] = [];
    for (let i = 6; i >= -11; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      lista.push(ymKey(d.getFullYear(), d.getMonth() + 1));
    }
    return lista; // já ordenada desc (mais recente primeiro)
  }, []);

  const navegar = useCallback(
    (nextMeses: string[]) => {
      const qs = new URLSearchParams();
      const ordenados = [...nextMeses].sort();
      if (ordenados.length) qs.set("meses", ordenados.join(","));
      if (realizado) qs.set("realizado", "1");
      const str = qs.toString();
      router.push(`/admin/financeiro${str ? `?${str}` : ""}`);
    },
    [router, realizado]
  );

  const toggle = (key: string) => {
    const set = new Set(meses);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    // Se desmarcar tudo, volta pro mês corrente (evita estado vazio).
    if (set.size === 0) set.add(ymKey(new Date().getFullYear(), new Date().getMonth() + 1));
    navegar(Array.from(set));
  };

  const resumo =
    meses.length === 0
      ? "—"
      : meses.length === 1
      ? ymLabel(meses[0])
      : `${meses.length} meses`;

  return (
    <div className="flex items-center gap-2">
      <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none whitespace-nowrap">
        <input
          type="checkbox"
          checked={realizado}
          onChange={(e) => {
            const qs = new URLSearchParams();
            const ordenados = [...meses].sort();
            if (ordenados.length) qs.set("meses", ordenados.join(","));
            if (e.target.checked) qs.set("realizado", "1");
            const str = qs.toString();
            router.push(`/admin/financeiro${str ? `?${str}` : ""}`);
          }}
          className="h-3.5 w-3.5 accent-royal-500"
        />
        Só pago
      </label>
      <details className="relative">
        <summary className="input h-8 text-xs inline-flex items-center gap-1.5 cursor-pointer list-none whitespace-nowrap pr-2 [&::-webkit-details-marker]:hidden">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {resumo}
        </summary>
        <div className="absolute right-0 z-30 mt-1 w-[168px] max-h-[280px] overflow-y-auto rounded-lg border border-border bg-bg-elevated shadow-xl p-1.5">
          {opcoes.map((key) => (
            <label
              key={key}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-200 hover:bg-bg rounded-md cursor-pointer"
            >
              <input
                type="checkbox"
                checked={meses.includes(key)}
                onChange={() => toggle(key)}
                className="h-3.5 w-3.5 accent-royal-500"
              />
              <span className="capitalize">{ymLabel(key)}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}