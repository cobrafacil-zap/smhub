"use client";

import { useEffect, useRef, useState } from "react";
import {
  Users,
  CalendarDays,
  BarChart3,
  Wallet,
  FileText,
  type LucideIcon,
} from "lucide-react";

/**
 * InteractiveShowcase — seção "clicando você vê como a plataforma ajuda".
 *
 * Tendência 2026: exploração não-linear + estrutura 3D que gira. Aqui vira um
 * coverflow: o painel do módulo ativo fica de frente; os laterais giram em
 * perspectiva (rotateY) e ficam clicáveis pra trazer pra frente. Leve — só
 * transforms CSS (GPU), sem libs.
 *
 * - seta ativo via chips, setas ←/→, teclado (←/→) e clique no painel lateral.
 * - responsivo: espaçamento medido pela largura do container.
 * - reduced-motion: sem rotação 3D (mostra painel ativo sem perspectiva).
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
  const [spacing, setSpacing] = useState(220);
  const [reduce, setReduce] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const deskMq = window.matchMedia("(min-width: 640px)");
    setReduce(reduceMq.matches);
    setIsDesktop(deskMq.matches);
    const measure = () => {
      const w = stageRef.current?.clientWidth ?? 600;
      // painel ~300px; espaçamento cresce com a tela, com teto.
      setSpacing(Math.max(150, Math.min(220, w * 0.3)));
    };
    const onDesk = () => setIsDesktop(deskMq.matches);
    measure();
    window.addEventListener("resize", measure);
    deskMq.addEventListener("change", onDesk);
    return () => {
      window.removeEventListener("resize", measure);
      deskMq.removeEventListener("change", onDesk);
    };
  }, []);

  // Navegação por teclado (←/→) quando a seção está em foco via clique.
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
    <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="text-center mb-10 sm:mb-12">
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

      {/* Stage 3D (anel/coverflow) — sempre dos dois lados (centralizado) */}
      <div
        ref={stageRef}
        className="relative h-[300px] sm:h-[380px] flex items-center justify-center"
        style={{ perspective: "1200px" }}
      >
        {/* Painéis */}
        <div
          className="relative w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {MODS.map((m, i) => {
            // Anel contínuo: offset pelo caminho mais curto (-2..2 p/ 5 itens)
            // → sempre há painéis dos dois lados = centralizado, nunca vazio de
            // um lado. No mobile (isDesktop=false) só o ativo aparece.
            const N = MODS.length;
            const offset =
              ((i - active + N + Math.floor(N / 2)) % N) - Math.floor(N / 2);
            const abs = Math.abs(offset);
            const isActive = offset === 0;
            const showSide = isDesktop && abs <= 2;
            const visible = isActive || showSide;
            const Icon = m.icon;

            // transform: empurra laterais pra fora, gira em perspectiva, recua
            // em Z e diminui. reduced-motion → só translada em X, sem 3D.
            const transform = reduce
              ? `translateX(${offset * 18}px) scale(${isActive ? 1 : 0.92})`
              : `translateX(${offset * spacing}px) translateZ(${
                  -abs * 80
                }px) rotateY(${offset * -42}deg) scale(${
                  isActive ? 1 : 0.78
                })`;

            return (
              <button
                type="button"
                key={m.title}
                onClick={() => setActive(i)}
                aria-label={m.title}
                tabIndex={visible ? 0 : -1}
                className="absolute left-1/2 top-1/2 w-[300px] max-w-[88vw] -translate-x-1/2 -translate-y-1/2 text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
                style={{
                  transform,
                  opacity: !visible ? 0 : isActive ? 1 : Math.max(0.16, 0.5 - abs * 0.16),
                  zIndex: 20 - abs,
                  pointerEvents: visible ? "auto" : "none",
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                }}
              >
                <div className="card group h-full p-6 flex flex-col gap-4 spotlight">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-xl border flex items-center justify-center ${m.accent}`}
                    >
                      <Icon className="h-5 w-5 icon-pop" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">
                        {m.title}
                      </h3>
                      <p className="text-xs text-slate-400">{m.tagline}</p>
                    </div>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {m.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-sm text-slate-300"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-royal-400 shrink-0" />
                        {b}
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
                  ? "bg-royal-500/15 border-royal-500/50 text-royal-200"
                  : "bg-bg-surface/60 border-border text-slate-400 hover:text-slate-200 hover:border-royal-500/30"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.title}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-500 mt-4">
        {active + 1} de {MODS.length} · clique num módulo ou nos cards laterais
      </p>
    </section>
  );
}