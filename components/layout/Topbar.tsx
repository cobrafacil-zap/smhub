import type { ReactNode } from "react";
import { LogOut, Bell, Eye } from "lucide-react";
import Link from "next/link";
import { initials } from "@/lib/utils";
import { signOutAction } from "@/app/login/actions";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  ClientFocusSwitcher,
  type ClienteResumo,
} from "@/components/layout/ClientFocusSwitcher";

export interface TopbarProps {
  userName: string;
  /** Subtítulo exibido ao lado do nome (ex.: "Agência X" / "Cliente Y"). */
  contextLabel?: string;
  /** URL para a home do role atual (ícone de sino/notificações fica opcional). */
  homeHref?: string;
  /**
   * Lista de clientes para o switcher. Quando `null`, o switcher não é
   * renderizado (ex.: role=cliente real). Quando fornecida mas com
   * 0 ou 1 itens, também não é renderizado (não há troca a fazer).
   */
  clientesList?: ClienteResumo[] | null;
  /** Id do cliente em foco atual (cookie) — usado para pré-selecionar. */
  currentClienteId?: string | null;
  /** Pathname atual — preservado no submit do switcher. */
  currentPathname?: string;
  /**
   * Indica que o usuário está em "modo foco de cliente" (admin/membro
   * com cookie válido). Mostra um chip discreto ao lado do nome.
   */
  focusedMode?: boolean;
  /**
   * Slot opcional renderizado entre as ações e o bloco do usuário
   * (ex.: chip "Foco: {cliente}" no admin quando há foco ativo).
   */
  customBeforeUser?: ReactNode;
}

export function Topbar({
  userName,
  contextLabel,
  homeHref,
  clientesList,
  currentClienteId,
  currentPathname,
  focusedMode,
  customBeforeUser,
}: TopbarProps) {
  const showSwitcher =
    Array.isArray(clientesList) && clientesList.length > 1 && !!currentPathname;

  return (
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-border">
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
        {/* ESQUERDA: contexto + (em lg) switcher inline */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {contextLabel && (
            <p className="text-xs text-slate-500 hidden sm:block truncate">
              {contextLabel}
            </p>
          )}
          {showSwitcher && (
            <div className="hidden lg:block">
              <ClientFocusSwitcher
                clientes={clientesList}
                currentId={currentClienteId ?? null}
                currentPathname={currentPathname!}
              />
            </div>
          )}
        </div>

        {/* DIREITA: ações + usuário */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          {homeHref && (
            <Link
              href={homeHref}
              className="group p-2 rounded-lg text-slate-500 hover:text-royal-300 hover:bg-bg-elevated transition"
              aria-label="Notificações"
            >
              <Bell className="h-4 w-4 icon-wiggle-hover" />
            </Link>
          )}

          {focusedMode && (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-royal-500/15 text-royal-200 border border-royal-500/30"
              title="Você está editando este cliente em modo foco"
            >
              <Eye className="h-3 w-3" />
              Modo foco
            </span>
          )}

          {customBeforeUser}

          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-royal-500 via-royal-550 to-royal-700 flex items-center justify-center text-white text-xs font-semibold transition-transform duration-200 hover:scale-105">
              {initials(userName)}
            </div>
            <span className="hidden sm:block text-sm text-slate-200 max-w-[120px] truncate">
              {userName}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="ml-1 p-1.5 rounded-md text-slate-500 hover:text-royal-300 hover:bg-bg-elevated"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Switcher em linha separada no mobile / tablet */}
      {showSwitcher && (
        <div className="lg:hidden px-4 pb-3 -mt-1">
          <ClientFocusSwitcher
            clientes={clientesList}
            currentId={currentClienteId ?? null}
            currentPathname={currentPathname!}
          />
        </div>
      )}
    </header>
  );
}
