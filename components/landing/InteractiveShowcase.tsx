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
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

/**
 * InteractiveShowcase — seção "clicando você vê como a plataforma ajuda".
 *
 * Agora com layout centralizado de verdade:
 * - Mobile: carrossel simples, um card por vez, centralizado, sem cortes.
 * - Desktop: coverflow 3D simétrico, card ativo no centro, vizinhos ±1.
 */

interface Mod {
  icon: LucideIcon;
  title: string;
  tagline: string;
  bullets: string[];
  accent: string;
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
    accent: "text-royal-300 bg-royal-500/15 border-royal-500/30",
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
    accent: "text-cyan-600 bg-cyan-500/15 border-cyan-500/30",
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
    accent: "text-emerald-600 bg-emerald-500/15 border-emerald-500/30",
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
    accent: "text-amber-600 bg-amber-500/15 border-amber-500/30",
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
    accent: "text-rose-600 bg-rose-500/15 border-rose-500/30",
  },
];

export function InteractiveShowcase() {
  const [active, setActive] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
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
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const deskMq = window.matchMedia("(min-width: 640px)");
    setReduce(reduceMq.matches);
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
        <p className="text-xs uppercase tracking-wider text-royal-300 font-semibold">
          Como a SM Hub ajuda
        </p>
        <h2 className="text-2xl sm:text-4xl font-bold mt-2">
          Clique e explore cada parte da plataforma
        </h2>
        <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
          Gire a estrutura e veja, na prática, como cada módulo tira peso do
          seu dia a dia.
        </p>
      </div>

      {/* MOBILE: carrossel simples e centralizado */}
      <div
        className="sm:hidden relative h-[360px] flex items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {MODS.map((m, i) => {
          const isActive = i === active;
          if (!isActive) return null;
          const Icon = m.icon;
          return (
            <button
              type="button"
              key={m.title}
              onClick={() => setActive(i)}
              className="absolute left-1/2 top-1/2 w-[min(88vw,340px)] -translate-x-1/2 -translate-y-1/2 text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            >
              <div className="card group p-4 flex flex-col gap-3 spotlight border-royal-500/40 shadow-elevated bg-gradient-to-b from-bg-elevated to-bg-surface">
                <div className="flex items-start gap-3">
                  <div className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 ${m.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-100 leading-tight">
                      {m.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
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
                      <Check className={cn("h-4 w-4 shrink-0 mt-0.5", m.accent.split(" ")[0])} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}

        {/* Setas mobile */}
        <button
          type="button"
          onClick={prev}
          aria-label="Módulo anterior"
          className="absolute left-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border border-border/70 bg-bg-surface/80 text-slate-300 flex items-center justify-center active:scale-95 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Próximo módulo"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border border-border/70 bg-bg-surface/80 text-slate-300 flex items-center justify-center active:scale-95 transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* DESKTOP: coverflow simétrico */}
      <div
        ref={stageRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="hidden sm:flex relative h-[440px] items-center justify-center overflow-visible"
        style={{ perspective: "1200px", perspectiveOrigin: "center center" }}
      >
        {MODS.map((m, i) => {
          const N = MODS.length;
          const offset =
            ((i - active + N + Math.floor(N / 2)) % N) - Math.floor(N / 2);
          const abs = Math.abs(offset);
          const isActive = offset === 0;
          const isNeighbor = abs === 1;
          const visible = isActive || isNeighbor;
          const Icon = m.icon;

          const transform = reduce
            ? `translateX(${offset * 120}%) scale(${isActive ? 1 : 0.9})`
            : `translateX(${offset * 280}px) translateZ(${-abs * 55}px) rotateY(${offset * -25}deg) scale(${isActive ? 1 : 0.85})`;

          return (
            <button
              type="button"
              key={m.title}
              onClick={() => setActive(i)}
              aria-label={m.title}
              tabIndex={visible ? 0 : -1}
              className={cn(
                "absolute left-1/2 top-1/2 w-[400px] -translate-x-1/2 -translate-y-1/2 text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer",
                visible ? "pointer-events-auto" : "pointer-events-none"
              )}
              style={{
                transform,
                opacity: !visible ? 0 : isActive ? 1 : 0.45,
                zIndex: isActive ? 30 : 20 - abs,
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
              }}
            >
              <div
                className={cn(
                  "card group p-5 flex flex-col gap-3 spotlight",
                  isActive
                    ? "border-royal-500/40 shadow-elevated bg-gradient-to-b from-bg-elevated to-bg-surface"
                    : "border-border/70 bg-bg-surface/80"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 ${m.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-100 leading-tight">
                      {m.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-snug mt-0.5">
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
                      <Check className={cn("h-4 w-4 shrink-0 mt-0.5", m.accent.split(" ")[0])} />
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
      <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-2">
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
                  ? "bg-royal-500 text-white border-royal-500 shadow-sm shadow-royal-500/25"
                  : "bg-bg-surface/60 border-border text-slate-400 hover:text-slate-200 hover:border-royal-500/30 hover:bg-bg-elevated"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.title}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-500 mt-4">
        {active + 1} de {MODS.length} ·{" "}
        {isDesktop
          ? "clique num módulo ou nos cards laterais"
          : "arraste o card ← →"}
      </p>
    </section>
  );
}
