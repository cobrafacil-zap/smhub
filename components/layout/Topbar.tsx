import { LogOut, Bell } from "lucide-react";
import Link from "next/link";
import { initials } from "@/lib/utils";
import { signOutAction } from "@/app/login/actions";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export interface TopbarProps {
  userName: string;
  /** Subtítulo exibido ao lado do nome (ex.: "Agência X" / "Cliente Y"). */
  contextLabel?: string;
  /** URL para a home do role atual (ícone de sino/notificações fica opcional). */
  homeHref?: string;
}

export function Topbar({ userName, contextLabel, homeHref }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-border">
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {contextLabel && (
            <p className="text-xs text-slate-500 hidden sm:block">{contextLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {homeHref && (
            <Link
              href={homeHref}
              className="group p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-bg-elevated transition"
              aria-label="Notificações"
            >
              <Bell className="h-4 w-4 icon-wiggle-hover" />
            </Link>
          )}
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-royal-500 to-royal-700 flex items-center justify-center text-white text-xs font-semibold transition-transform duration-200 hover:scale-105">
              {initials(userName)}
            </div>
            <span className="hidden sm:block text-sm text-slate-200 max-w-[120px] truncate">
              {userName}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="ml-1 p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-bg-elevated"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
