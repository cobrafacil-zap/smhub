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
 * InteractiveShowcase — módulos da plataforma em carrossel limpo.
 * Mobile: um card por vez, centralizado, com setas.
 * Desktop: cards alinhados horizontalmente, ativo em destaque.
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
          Clique em cada módulo e veja como a SM Hub tira peso do dia a dia da sua agência.
        </p>
      </div>

      {/* Mobile carousel */}
      <div
        className="sm:hidden relative h-[360px] flex items-center justify-center px-10"
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
              className="relative w-full max-w-[320px] text-left transition-opacity duration-300"
            >
              <Card active>
                <ModuleContent m={m} Icon={Icon} />
              </Card>
            </button>
          );
        })}

        <button
          type="button"
          onClick={prev}
          aria-label="Módulo anterior"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border border-border/70 bg-bg-surface/80 text-slate-300 flex items-center justify-center active:scale-95 transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Próximo módulo"
          className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border border-border/70 bg-bg-surface/80 text-slate-300 flex items-center justify-center active:scale-95 transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-4 lg:gap-5 items-stretch">
        {MODS.map((m, i) => {
          const isActive = i === active;
          const Icon = m.icon;
          return (
            <button
              type="button"
              key={m.title}
              onClick={() => setActive(i)}
              className={cn(
                "text-left transition-all duration-300 rounded-[1.5rem] border p-5",
                isActive
                  ? "border-royal-500/40 bg-bg-surface shadow-card"
                  : "border-border/60 bg-bg-surface/50 hover:border-royal-500/30 hover:bg-bg-surface"
              )}
            >
              <ModuleContent m={m} Icon={Icon} />
            </button>
          );
        })}
      </div>

      {/* Chips de navegação */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
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
                  ? "bg-royal-500 text-white border-royal-500"
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
        {active + 1} de {MODS.length} · {isDesktop ? "clique em um card" : "arraste o card ← →"}
      </p>
    </section>
  );
}

function Card({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border p-4 sm:p-5 flex flex-col gap-3",
        active
          ? "border-royal-500/40 bg-bg-surface shadow-card"
          : "border-border/60 bg-bg-surface/50"
      )}
    >
      {children}
    </div>
  );
}

function ModuleContent({ m, Icon }: { m: Mod; Icon: LucideIcon }) {
  return (
    <>
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
    </>
  );
}
