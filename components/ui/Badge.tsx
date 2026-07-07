import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Variant = "default" | "success" | "danger" | "warning" | "info" | "brand";

const variants: Record<Variant, string> = {
  default: "bg-bg-muted text-slate-300 border border-border",
  success: "bg-success-500/15 text-success-400 border border-success-500/30",
  danger: "bg-danger-500/15 text-danger-400 border border-danger-500/30",
  warning: "bg-warning-500/15 text-warning-400 border border-warning-500/30",
  info: "bg-accent-500/15 text-accent-500 border border-accent-500/30",
  brand: "bg-royal-500/15 text-royal-300 border border-royal-500/30",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span className={cn("badge", variants[variant], className)} {...props} />
  );
}
