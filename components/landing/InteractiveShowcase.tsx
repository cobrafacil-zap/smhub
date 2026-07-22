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
 * InteractiveShowcase — seção "clicando você vê como a plataforma ajuda".
 *
 * Layout centralizado e robusto: o card ativo fica sempre no meio exato do
 * palco. Os cards laterais (desktop) são posicionados a partir desse centro,
 * com transformações 3D suaves. Em mobile mostra apenas o card ativo, com swipe.
 *
 * - navegação por chips, setas do teclado (←/→) e clique no card lateral.
 * - reduced-motion: cards deslizam lateralmente sem perspectiva 3D.
 */

interface Mod {
  icon: LucideIcon;
  title: string;
  tagline: string;
  bullets: string[];
  accent: string; // classe de cor do ícone
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
  const [spacing, setSpacing] = useState(260);
  const [reduce, setReduce] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    // Só age no swipe horizontal (não rouba o scroll vertical da página).
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      setActive((a) =>
        dx < 0 ? (a + 1) % MODS.length : (a - 1 + MODS.length) % MODS.length
      );
    }
    touchStart.current = null;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const deskMq = window.matchMedia("(min-width: 640px)");
    setReduce(reduceMq.matches);
    setIsDesktop(deskMq.matches);

    const measure = () => {
      const containerW = stageRef.current?.clientWidth ?? 800;
      const cardW = deskMq.matches ? 420 : Math.min(340, window.innerWidth - 64);
      // Espaçamento: card lateral fica parcialmente visível, mas o trio
      // permanece centrado. Calculado a partir do espaço sobrando.
      const available = Math.max(0, containerW - cardW);
      const ideal = available * 0.38; // ~75% do espaço livre de cada lado
      setSpacing(Math.max(180, Math.min(360, ideal)));
    };

    const onDesk = () => {
      setIsDesktop(deskMq.matches);
      measure();
    };

    measure();
    window.addEventListener("resize", measure);
    deskMq.addEventListener("change", onDesk);
    return () => {
      window.removeEventListener("resize", measure);
      deskMq.removeEventListener("change", onDesk);
    };
  }, []);

  // Navegação por teclado (←/→).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setActive((a) => (a + 1) % MODS.length);
      if (e.key === "ArrowLeft")
        setActive((a) => (a - 1 + MODS.length) % MODS.length);
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

      {/* Palco 3D: cards posicionados a partir do centro exato. */}
      <div
        ref={stageRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative h-[400px] sm:h-[460px] flex items-center justify-center overflow-visible py-6"
        style={{
          perspective: "1200px",
          perspectiveOrigin: "center center",
          touchAction: "pan-y",
        }}
      >
        <div
          className="relative w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {MODS.map((m, i) => {
            const N = MODS.length;
            // Caminho mais curto no anel, para que sempre haja vizinhos dos dois lados.
            const offset =
              ((i - active + N + Math.floor(N / 2)) % N) - Math.floor(N / 2);
            const abs = Math.abs(offset);
            const isActive = offset === 0;
            const isNeighbor = abs === 1;
            const showSide = isDesktop && isNeighbor;
            const visible = isActive || showSide;
            const Icon = m.icon;

            // translate(-50%, -50%) corrige o posicionamento left-1/2 top-1/2,
            // mantendo o centro do card exatamente no centro do palco.
            const transform = reduce
              ? `translate(-50%, -50%) translateX(${
                  isActive ? 0 : offset * 110
                }%) scale(${isActive ? 1 : 0.92})`
              : `translate(-50%, -50%) translateX(${
                  offset * spacing
                }px) translateZ(${-abs * 50}px) rotateY(${
                  offset * -22
                }deg) scale(${isActive ? 1 : 0.86})`;

            return (
              <button
                type="button"
                key={m.title}
                onClick={() => setActive(i)}
                aria-label={m.title}
                tabIndex={visible ? 0 : -1}
                className={cn(
                  "absolute left-1/2 top-1/2 w-[min(88vw,340px)] sm:w-[420px] text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer",
                  visible ? "pointer-events-auto" : "pointer-events-none"
                )}
                style={{
                  transform,
                  opacity: !visible ? 0 : isActive ? 1 : 0.42,
                  zIndex: isActive ? 30 : 20 - abs,
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                  transformOrigin: "center center",
                }}
              >
                <div
                  className={cn(
                    "card group p-4 sm:p-5 flex flex-col gap-3 spotlight",
                    isActive
                      ? "border-royal-500/40 shadow-elevated bg-gradient-to-b from-bg-elevated to-bg-surface"
                      : "border-border/70 bg-bg-surface/80"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 ${m.accent}`}
                    >
                      <Icon className="h-5 w-5" />
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
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0 mt-0.5",
                            m.accent.split(" ")[0]
                          )}
                        />
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
      </div>

      {/* Chips de navegação */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
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
