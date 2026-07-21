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
  KanbanSquare,
  CalendarRange,
  ClipboardList,
  Video,
} from "lucide-react";
import type { ComponentType } from "react";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };

// Itens por área. Antes só o admin tinha menu mobile — cliente e super-admin
// ficavam sem navegação no celular. Agora cada layout passa seu `variant`.
const ITEMS: Record<"admin" | "admin-membro" | "cliente" | "super-admin", NavItem[]> = {
  admin: [
    { href: "/admin", label: "Home", icon: LayoutDashboard },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/contratos", label: "Contratos", icon: FileText },
    { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
    { href: "/admin/configuracoes", label: "Config", icon: Settings },
  ],
  // Membro da equipe: foco em produção + suas tarefas (sem áreas comerciais).
  "admin-membro": [
    { href: "/admin", label: "Home", icon: LayoutDashboard },
    { href: "/admin/tarefas", label: "Tarefas", icon: KanbanSquare },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/planejamentos", label: "Plan.", icon: CalendarRange },
    { href: "/admin/briefings", label: "Briefings", icon: ClipboardList },
    { href: "/admin/gravacoes", label: "Gravações", icon: Video },
  ],
  cliente: [
    { href: "/cliente", label: "Início", icon: LayoutDashboard },
    { href: "/cliente/planejamento", label: "Planejar", icon: CalendarDays },
    { href: "/cliente/gravacoes", label: "Gravações", icon: Video },
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

export function BottomNav({
  variant = "admin",
  role,
}: {
  variant?: "admin" | "cliente" | "super-admin";
  role?: "admin_agencia" | "membro_equipe";
}) {
  const pathname = usePathname();
  // Membro da agência usa o set focado em produção.
  const key = variant === "admin" && role === "membro_equipe" ? "admin-membro" : variant;
  const items = ITEMS[key as "admin" | "admin-membro" | "cliente" | "super-admin"];
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