"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  Settings,
  CalendarDays,
  BarChart3,
  User,
  Building2,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };

// Itens por área. Antes só o admin tinha menu mobile — cliente e super-admin
// ficavam sem navegação no celular. Agora cada layout passa seu `variant`.
const ITEMS: Record<"admin" | "cliente" | "super-admin", NavItem[]> = {
  admin: [
    { href: "/admin", label: "Home", icon: LayoutDashboard },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/contratos", label: "Contratos", icon: FileText },
    { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
    { href: "/admin/configuracoes", label: "Config", icon: Settings },
  ],
  cliente: [
    { href: "/cliente", label: "Início", icon: LayoutDashboard },
    { href: "/cliente/planejamento", label: "Planejar", icon: CalendarDays },
    { href: "/cliente/relatorios", label: "Relatórios", icon: BarChart3 },
    { href: "/cliente/contratos", label: "Contratos", icon: FileText },
    { href: "/cliente/financeiro", label: "Financeiro", icon: Wallet },
    { href: "/cliente/conta", label: "Conta", icon: User },
  ],
  "super-admin": [
    { href: "/super-admin", label: "Início", icon: LayoutDashboard },
    { href: "/super-admin/agencias", label: "Agências", icon: Building2 },
    { href: "/super-admin/financeiro", label: "Financeiro", icon: Wallet },
    { href: "/super-admin/super-admins", label: "Admins", icon: ShieldCheck },
    { href: "/super-admin/templates-contrato", label: "Templates", icon: FileText },
    { href: "/super-admin/configuracoes", label: "Config", icon: Settings },
  ],
};

export function BottomNav({ variant = "admin" }: { variant?: "admin" | "cliente" | "super-admin" }) {
  const pathname = usePathname();
  const items = ITEMS[variant];
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-surface/95 backdrop-blur border-t border-border">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
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