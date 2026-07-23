"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Users,
  CalendarDays,
  BarChart3,
  Wallet,
  FileText,
  Check,
  type LucideIcon,
} from "lucide-react";

/**
 * InteractiveShowcase — carrossel 3D de um card por vez.
 *
 * Mobile e desktop compartilham a mesma experiência:
 * - um card ativo no centro;
 * - arraste para o lado ou clique nos chips para navegar;
 * - vizinhos laterais visíveis no desktop, apenas sombra no mobile.
 */

interface Mod {
  icon: LucideIcon;
  title: string;
  tagline: string;
  bullets: string[];
}

const MODS: Mod[] = [
  {
    icon: Users,
    title: "Clientes",
    tagline: "Todos os seus clientes num só painel",
    bullets: [
      "Cadastro, status e histórico em segundos",
      "Alertas de inadimplência e faturas a vencer",
      "Atalhos pra briefing, contrato e financeiro de cada conta",
    ],
  },
  {
    icon: CalendarDays,
    title: "Planejamento editorial",
    tagline: "Calendário sem caos nem planilha",
    bullets: [
      "Arraste e solte posts no calendário editorial",
      "Aprovação de conteúdo com o cliente in-app",
      "Datas comemorativas e ideias sugeridas automaticamente",
    ],
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    tagline: "Relatórios bonitos que vendem o serviço",
    bullets: [
      "Métricas de Instagram e Facebook puxadas sozinhas",
      "Exportação em PDF com a sua marca",
      "Leads e alcance por período, prontos pra apresentar",
    ],
  },
  {
    icon: Wallet,
    title: "Financeiro",
    tagline: "O dinheiro da agência sob controle",
    bullets: [
      "Faturas, receitas e despesas centralizadas",
      "Cobrança recorrente e recibos automáticos",
      "Saldo do mês e inadimplência num olhar",
    ],
  },
  {
    icon: FileText,
    title: "Contratos digitais",
    tagline: "Contrato e assinatura sem impressora",
    bullets: [
      "Templates prontos pra cada tipo de serviço",
      "Assinatura eletrônica com validade jurídica",
      "Portal do cliente pra assinar e acompanhar",
    ],
  },
];

export function InteractiveShowcase() {
  const [active, setActive] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const prev = () => setActive((a) => (a - 1 + MODS.length) % MODS.length);
  const next = () => setActive((a) => (a + 1) % MODS.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      dx < 0 ? next() : prev();
    }
    touchStart.current = null;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const deskMq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(deskMq.matches);
    const onDesk = () => setIsDesktop(deskMq.matches);
    deskMq.addEventListener("change", onDesk);
    return () => deskMq.removeEventListener("change", onDesk);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="text-center mb-6 sm:mb-8">
        <p className="text-xs text-slate-500 font-medium">Módulos</p>
        <h2 className="text-2xl sm:text-4xl font-bold mt-2">
          Uma plataforma, todas as etapas
        </h2>
        <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
          Arraste para o lado ou clique nos módulos abaixo para explorar.
        </p>
      </div>

      {/* Carrossel 3D: sempre um card ativo no centro. */}
      <div
        className="relative h-[380px] sm:h-[420px] flex items-center justify-center overflow-visible"
        style={{ perspective: "1200px", perspectiveOrigin: "center center" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {MODS.map((m, i) => {
          const N = MODS.length;
          const offset =
            ((i - active + N + Math.floor(N / 2)) % N) - Math.floor(N / 2);
          const abs = Math.abs(offset);
          const isActive = offset === 0;
          const isNeighbor = abs === 1;
          const showSide = isDesktop && isNeighbor;
          const visible = isActive || showSide;
          const Icon = m.icon;

          const transform = isDesktop
            ? `translate(-50%, -50%) translateX(${offset * 340}px) translateZ(${-abs * 80}px) rotateY(${offset * -22}deg) scale(${isActive ? 1 : 0.82})`
            : `translate(-50%, -50%) translateX(${offset * 90}%) scale(${isActive ? 1 : 0.85})`;

          return (
            <button
              type="button"
              key={m.title}
              onClick={() => setActive(i)}
              aria-label={m.title}
              tabIndex={visible ? 0 : -1}
              className={cn(
                "group absolute left-1/2 top-1/2 w-[min(88vw,360px)] sm:w-[420px] text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer",
                visible ? "pointer-events-auto" : "pointer-events-none"
              )}
              style={{
                transform,
                opacity: !visible ? 0 : isActive ? 1 : 0.4,
                zIndex: isActive ? 30 : 20 - abs,
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                transformOrigin: "center center",
              }}
            >
              <div
                className={cn(
                  "rounded-[1.5rem] border p-4 sm:p-5 flex flex-col gap-3 transition-all duration-300",
                  isActive
                    ? "border-royal-500/45 bg-bg-surface shadow-[0_0_48px_-10px_rgba(88,108,240,0.32)]"
                    : "border-border/60 bg-bg-surface/60 group-hover:border-royal-400/40 group-hover:bg-bg-surface/80"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl border border-royal-500/20 bg-royal-500/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-royal-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-100 leading-tight">
                      {m.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-snug mt-0.5">
                      {m.tagline}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {m.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-[13px] leading-snug text-slate-300"
                    >
                      <Check className="h-4 w-4 shrink-0 mt-0.5 text-royal-300" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {!isActive && (
                  <p className="text-[11px] text-royal-300/80 font-medium pt-1">
                    Clique pra ver →
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Chips de navegação */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {MODS.map((m, i) => {
          const Icon = m.icon;
          const isActive = i === active;
          return (
            <button
              type="button"
              key={m.title}
              onClick={() => setActive(i)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                isActive
                  ? "bg-royal-500 text-white border-royal-500 shadow-[0_0_12px_-2px_rgba(88,108,240,0.4)]"
                  : "bg-bg-surface/60 border-border text-slate-400 hover:text-slate-200 hover:border-royal-400/40 hover:bg-bg-elevated"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.title}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        {/* Indicador de swipe no mobile */}
        <div className="flex items-center gap-2 text-xs text-slate-400 sm:hidden">
          <span className="inline-flex h-6 items-center gap-1 px-2 rounded-full border border-border bg-bg-surface/60">
            <span className="inline-block w-1 h-1 rounded-full bg-royal-300" />
            arraste o card pro lado
            <span className="inline-block w-1 h-1 rounded-full bg-royal-300" />
          </span>
          <span className="flex gap-1">
            {MODS.map((_, i) => (
              <span
                key={i}
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-4 bg-royal-400" : "w-1.5 bg-slate-600"
                }`}
              />
            ))}
          </span>
        </div>

        <p className="text-xs text-slate-500 hidden sm:block">
          {active + 1} de {MODS.length} · arraste o card ← →
        </p>
      </div>
    </section>
  );
}
