import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function FilterBar({
  children,
  action,
  method = "GET",
  className,
}: {
  children: ReactNode;
  action?: string;
  method?: "GET" | "POST";
  className?: string;
}) {
  return (
    <form method={method} action={action} className={cn("card", className)} role="search">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
    </form>
  );
}

export function FilterField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
    </div>
  );
}

export function FilterActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex items-end gap-2", className)}>{children}</div>;
}
