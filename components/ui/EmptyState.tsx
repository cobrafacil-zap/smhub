import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Reveal } from "./motion/Reveal";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <Reveal
      as="div"
      className={cn(
        "text-center",
        compact ? "py-6 px-3" : "py-10 px-6",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "mx-auto mb-3 text-slate-500 icon-bob",
            compact ? "text-2xl" : "text-4xl"
          )}
        >
          {icon}
        </div>
      )}
      <h3
        className={cn(
          "font-semibold text-slate-200",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "text-slate-400 mt-1 max-w-md mx-auto",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </Reveal>
  );
}
