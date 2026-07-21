"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/login/actions";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  BarChart3,
  CalendarRange,
  ClipboardList,
  CalendarHeart,
  UserCog,
  Settings,
  CreditCard,
  KanbanSquare,
  Video,
  LogOut,
} from "lucide-react";
import type { ComponentType } from "react";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: "Principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/clientes", label: "Clientes", icon: Users },
      { href: "/admin/contratos", label: "Contratos", icon: FileText },
      { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
      { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    title: "Produção",
    items: [
      { href: "/admin/tarefas", label: "Tarefas", icon: KanbanSquare },
      { href: "/admin/planejamentos", label: "Planejamentos", icon: CalendarRange },
      { href: "/admin/briefings", label: "Briefings", icon: ClipboardList },
      { href: "/admin/datas-comemorativas", label: "Datas comemorativas", icon: CalendarHeart },
      { href: "/admin/gravacoes", label: "Gravações", icon: Video },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/admin/equipe", label: "Equipe", icon: UserCog },
      { href: "/admin/planos", label: "Planos", icon: CreditCard },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

// Áreas exclusivas do admin (membro_equipe não vê nem acessa).
const ADMIN_ONLY = new Set([
  "/admin/contratos",
  "/admin/financeiro",
  "/admin/relatorios",
  "/admin/equipe",
  "/admin/planos",
  "/admin/configuracoes",
]);

export function SidebarAdmin({
  userName,
  agencyName,
  agencyLogoUrl,
  role = "admin_agencia",
}: {
  userName: string;
  agencyName?: string;
  agencyLogoUrl?: string | null;
  role?: "admin_agencia" | "membro_equipe";
}) {
  const pathname = usePathname();
  const isMember = role === "membro_equipe";

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-bg-surface border-r border-border min-h-screen">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-royal-500 to-royal-700 flex items-center justify-center text-white font-bold text-sm shadow-glow overflow-hidden shrink-0 relative">
            {agencyLogoUrl ? (
              <Image
                src={agencyLogoUrl}
                alt={agencyName ?? "Logo"}
                fill
                sizes="36px"
                className="object-contain"
              />
            ) : (
              "SM"
            )}
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-semibold text-sm text-white truncate">
              {agencyName ?? "SM Hub"}
            </p>
            <p className="text-[11px] text-slate-500">Painel da agência</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {groups.map((group) => {
          // Filtra itens admin-only para membros. Grupos que ficarem vazios somem.
          const items = isMember
            ? group.items.filter((it) => !ADMIN_ONLY.has(it.href))
            : group.items;
          if (items.length === 0) return null;
          return (
          <div key={group.title}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
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
            </div>
          </div>
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
                Sair da conta
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}