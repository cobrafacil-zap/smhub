"use client";

import dynamic from "next/dynamic";

// recharts (ResponsiveContainer) quebra no SSR do App Router. Carregamos o
// chart só no cliente (ssr: false) pra evitar o "server-side exception" na
// página de financeiro. O wrapper é um Client Component pq ssr:false só
// funciona em Client Components.
const FinanceChart = dynamic(
  () => import("./FinanceChart").then((m) => m.FinanceChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 flex items-center justify-center text-sm text-slate-500">
        Carregando gráfico…
      </div>
    ),
  }
);

export function FinanceChartClient(props: { data: ChartItem[] }) {
  return <FinanceChart {...props} />;
}

type ChartItem = {
  mes: string;
  receita: number;
  despesa: number;
  saldo: number;
};