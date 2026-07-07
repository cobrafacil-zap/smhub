"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, FileText, Wallet, Settings } from "lucide-react";
import type { ComponentType } from "react";

const items = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/contratos", label: "Contratos", icon: FileText },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/configuracoes", label: "Config", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-surface/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon as ComponentType<{ className?: string }>;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
                active ? "text-royal-300" : "text-slate-500"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
