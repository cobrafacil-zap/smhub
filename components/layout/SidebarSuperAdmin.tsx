"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/login/actions";
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  FileText,
  Settings,
  Wallet,
  LogOut,
} from "lucide-react";
import type { ComponentType } from "react";

const items = [
  { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/agencias", label: "Agências", icon: Building2 },
  { href: "/super-admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/super-admin/super-admins", label: "Super Admins", icon: ShieldCheck },
  { href: "/super-admin/templates-contrato", label: "Templates", icon: FileText },
  { href: "/super-admin/configuracoes", label: "Configurações", icon: Settings },
];

export function SidebarSuperAdmin({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-bg-surface border-r border-border min-h-screen">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/super-admin" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-royal-500 to-royal-700 flex items-center justify-center text-white font-bold text-sm shadow-glow">
            SM
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-semibold text-sm text-white">SM Hub</p>
            <p className="text-[11px] text-slate-500">Super Admin</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Plataforma
        </p>
        {items.map((item) => {
          const Icon = item.icon as ComponentType<{ className?: string }>;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition",
                active
                  ? "bg-royal-500/15 text-royal-200"
                  : "text-slate-400 hover:bg-bg-elevated hover:text-slate-100"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center h-7 w-7 rounded-md text-sm transition",
                  active
                    ? "bg-royal-500/20 text-royal-200"
                    : "bg-bg-elevated text-slate-400 group-hover:text-slate-200"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-royal-500 to-royal-700 flex items-center justify-center text-white text-xs font-semibold">
            {userName
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-[11px] text-slate-500 hover:text-slate-300 inline-flex items-center gap-1"
              >
                <LogOut className="h-3 w-3" />
                Sair
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
