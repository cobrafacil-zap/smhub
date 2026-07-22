"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Reveal } from "@/components/ui/motion/Reveal";

interface ChartItem {
  mes: string;
  receita: number;
  despesa: number;
  saldo: number;
}

const tooltipStyle = {
  backgroundColor: "#0F172A",
  border: "1px solid #1E293B",
  borderRadius: 8,
  color: "#E2E8F0",
  fontSize: 12,
};

export function FinanceChart({ data }: { data: ChartItem[] }) {
  return (
    <Reveal as="div" className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
          <XAxis dataKey="mes" stroke="#94A3B8" tick={{ fontSize: 12 }} />
          <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(61, 90, 254, 0.1)" }}
            formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
          <Bar dataKey="receita" fill="#10B981" radius={[6, 6, 0, 0]} name="Receita" animationDuration={900} />
          <Bar dataKey="despesa" fill="#F43F5E" radius={[6, 6, 0, 0]} name="Despesa" animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </Reveal>
  );
}
