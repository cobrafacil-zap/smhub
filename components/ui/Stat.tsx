"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type StatTone = "default" | "brand" | "success" | "warn" | "danger";

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  trend?: { value: number; suffix?: string };
}

const toneStyles: Record<StatTone, { bg: string; text: string; iconBg: string }> = {
  default: {
    bg: "bg-bg-elevated/80",
    text: "text-slate-100",
    iconBg: "bg-bg-muted text-slate-400",
  },
  brand: {
    bg: "bg-gradient-to-br from-royal-500/15 to-royal-700/5 border-royal-500/30",
    text: "text-slate-100",
    iconBg: "bg-royal-500/20 text-royal-300",
  },
  success: {
    bg: "bg-success-500/10 border-success-500/30",
    text: "text-slate-100",
    iconBg: "bg-success-500/20 text-success-400",
  },
  warn: {
    bg: "bg-warning-500/10 border-warning-500/30",
    text: "text-slate-100",
    iconBg: "bg-warning-500/20 text-warning-400",
  },
  danger: {
    bg: "bg-danger-500/10 border-danger-500/30",
    text: "text-slate-100",
    iconBg: "bg-danger-500/20 text-danger-400",
  },
};

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "default",
  trend,
}: StatProps) {
  const styles = toneStyles[tone];
  return (
    <div
      className={cn(
        "card border flex flex-col gap-3",
        styles.bg,
        tone === "default" && "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {icon && (
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", styles.iconBg)}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn("text-xl sm:text-2xl font-bold kpi-num break-words leading-tight", styles.text)}>
        {value}
      </div>
      <div className="flex items-center gap-2 text-xs">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              trend.value > 0 && "text-success-400",
              trend.value < 0 && "text-danger-400",
              trend.value === 0 && "text-slate-400"
            )}
          >
            {trend.value > 0 && <TrendingUp className="h-3 w-3" />}
            {trend.value < 0 && <TrendingDown className="h-3 w-3" />}
            {trend.value === 0 && <Minus className="h-3 w-3" />}
            {Math.abs(trend.value).toFixed(1).replace(".", ",")}%
            {trend.suffix}
          </span>
        )}
        {hint && <span className="text-slate-500">{hint}</span>}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  tone?: StatTone;
}

export function StatCard(props: StatCardProps) {
  const trendMap: Record<"up" | "down" | "flat", { value: number }> = {
    up: { value: 1 },
    down: { value: -1 },
    flat: { value: 0 },
  };
  return (
    <Stat
      label={props.label}
      value={props.value}
      hint={props.hint}
      icon={props.icon}
      tone={props.tone ?? "default"}
      trend={props.trend ? trendMap[props.trend] : undefined}
    />
  );
}

export type { LucideIcon };
