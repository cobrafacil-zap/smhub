"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  href?: string;
}

type TabsBaseProps = { items: TabItem[]; className?: string };

/** Tabs controladas (estado client-side). */
export function Tabs({
  items,
  activeKey,
  onChange,
  className,
}: TabsBaseProps & { activeKey: string; onChange: (key: string) => void }) {
  return (
    <div
      role="tablist"
      className={cn("flex gap-1 border-b border-border mb-4 overflow-x-auto", className)}
    >
      {items.map((item) => {
        const active = activeKey === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap inline-flex items-center gap-2",
              active
                ? "border-royal-500 text-royal-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-semibold",
                  active ? "bg-royal-500/20 text-royal-200" : "bg-bg-muted text-slate-400"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Tabs href-driven (?tab=). */
export function TabsLink({
  items,
  basePath,
  paramName = "tab",
  className,
}: TabsBaseProps & { basePath: string; paramName?: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const activeKey = search.get(paramName) ?? items[0]?.key ?? "";

  return (
    <div
      role="tablist"
      className={cn("flex gap-1 border-b border-border mb-4 overflow-x-auto", className)}
    >
      {items.map((item) => {
        const active = activeKey === item.key;
        const params = new URLSearchParams(search.toString());
        params.set(paramName, item.key);
        const href = item.href ?? `${pathname}?${params.toString()}`;
        return (
          <Link
            key={item.key}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              "px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap inline-flex items-center gap-2",
              active
                ? "border-royal-500 text-royal-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-semibold",
                  active ? "bg-royal-500/20 text-royal-200" : "bg-bg-muted text-slate-400"
                )}
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
