import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Reveal } from "./motion/Reveal";

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <Reveal
      as="div"
      className={cn("flex items-start justify-between gap-3 flex-wrap", className)}
    >
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="text-xs text-slate-500 mb-2 flex items-center gap-1 flex-wrap"
          >
            {breadcrumbs.map((b, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <span key={i} className="inline-flex items-center gap-1">
                  {b.href && !last ? (
                    <Link href={b.href} className="hover:text-royal-400">
                      {b.label}
                    </Link>
                  ) : (
                    <span className={last ? "text-slate-300" : ""}>{b.label}</span>
                  )}
                  {!last && <span className="text-slate-600">›</span>}
                </span>
              );
            })}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{title}</h1>
        {description && (
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </Reveal>
  );
}
