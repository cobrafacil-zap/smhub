import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MiniStatProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "brand" | "success" | "warn" | "danger";
  hint?: string;
}

const toneStyles: Record<NonNullable<MiniStatProps["tone"]>, { bg: string; iconBg: string; iconColor: string }> = {
  default: {
    bg: "bg-bg-elevated/60 border-border",
    iconBg: "bg-bg-muted",
    iconColor: "text-slate-400",
  },
  brand: {
    bg: "bg-royal-500/10 border-royal-500/20",
    iconBg: "bg-royal-500/20",
    iconColor: "text-royal-300",
  },
  success: {
    bg: "bg-success-500/10 border-success-500/20",
    iconBg: "bg-success-500/20",
    iconColor: "text-success-400",
  },
  warn: {
    bg: "bg-warning-500/10 border-warning-500/20",
    iconBg: "bg-warning-500/20",
    iconColor: "text-warning-400",
  },
  danger: {
    bg: "bg-danger-500/10 border-danger-500/20",
    iconBg: "bg-danger-500/20",
    iconColor: "text-danger-400",
  },
};

export function MiniStat({ label, value, icon, tone = "default", hint }: MiniStatProps) {
  const styles = toneStyles[tone];
  return (
    <div className={cn("rounded-lg border p-3 flex flex-col gap-1.5", styles.bg)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {icon && (
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", styles.iconBg, styles.iconColor)}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-slate-100 leading-none">{value}</p>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
