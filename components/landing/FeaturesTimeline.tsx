"use client";

import { useEffect, useRef, useState } from "react";
import {
  Users,
  CalendarDays,
  TrendingUp,
  Wallet,
  FileText,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/ui/motion/Reveal";

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Users,
    title: "Gestão de Clientes",
    desc: "Cadastro completo, segmentação, status e portal individual para cada cliente.",
  },
  {
    icon: CalendarDays,
    title: "Planejamento Editorial",
    desc: "Calendário mensal com posts, stories, reels e carrosséis por cliente.",
  },
  {
    icon: TrendingUp,
    title: "Relatórios de Mídias",
    desc: "Métricas de Instagram, Facebook, TikTok, LinkedIn, YouTube e X.",
  },
  {
    icon: Wallet,
    title: "Financeiro",
    desc: "Receitas, despesas, faturas e fluxo de caixa da sua agência.",
  },
  {
    icon: FileText,
    title: "Contratos Digitais",
    desc: "Crie e envie contratos com assinatura eletrônica integrada.",
  },
  {
    icon: UserCog,
    title: "Multi-usuário",
    desc: "Equipe com permissões separadas: admin e membros de equipe.",
  },
];

function useTimelineProgress(sectionRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handle = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const start = rect.top - vh * 0.8;
        const end = rect.bottom - vh * 0.2;
        const range = end - start;
        const value = range <= 0 ? 1 : Math.max(0, Math.min(1, -start / range));
        setProgress(value);
      });
    };

    handle();
    window.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle, { passive: true });
    return () => {
      window.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sectionRef]);

  return progress;
}

export function FeaturesTimeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeCount, setActiveCount] = useState(0);
  const progress = useTimelineProgress(sectionRef);

  useEffect(() => {
    let raf: number | null = null;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const vh = window.innerHeight;
        const threshold = vh * 0.55;
        const items = sectionRef.current?.querySelectorAll("[data-timeline-item]") ?? [];
        let count = 0;
        items.forEach((el) => {
          const top = el.getBoundingClientRect().top;
          if (top < threshold) count++;
        });
        setActiveCount(count);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const total = FEATURES.length;
  const markerPositions = FEATURES.map((_, i) => (i / (total - 1)) * 100);

  // Nó neon: limitado ao centro do último marcador
  const clampedProgress = Math.min(progress, 1);
  const nodeTop = `${clampedProgress * markerPositions[markerPositions.length - 1]}%`;

  return (
    <section
      ref={sectionRef}
      id="funcionalidades"
      className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 scroll-mt-20"
    >
      <div className="text-center mb-12 sm:mb-16">
        <p className="text-xs text-slate-500 font-medium">Funcionalidades</p>
        <h2 className="text-2xl sm:text-4xl font-bold mt-2">
          Do briefing ao fechamento
        </h2>
        <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
          Cada etapa da operação da sua agência em um só fluxo, sem planilhas
          soltas.
        </p>
      </div>

      <div className="relative">
        {/* Track base — segmentos entre marcadores */}
        {markerPositions.slice(0, -1).map((pos, i) => {
          const next = markerPositions[i + 1];
          const gap = 7; // % de espaço reservado ao redor do marcador
          const top = `${pos + gap}%`;
          const height = `${next - pos - gap * 2}%`;
          return (
            <div
              key={`track-${i}`}
              className="hidden md:block absolute left-1/2 -translate-x-1/2 w-px"
              style={{ top, height }}
            >
              <div className="absolute inset-0 bg-royal-500/15" />
            </div>
          );
        })}

        {markerPositions.slice(0, -1).map((pos, i) => {
          const next = markerPositions[i + 1];
          const gap = 7;
          const top = `${pos + gap}%`;
          const height = `${next - pos - gap * 2}%`;
          return (
            <div
              key={`track-mobile-${i}`}
              className="md:hidden absolute left-4 w-px"
              style={{ top, height }}
            >
              <div className="absolute inset-0 bg-royal-500/15" />
            </div>
          );
        })}

        {/* Progresso neon — segmentos entre marcadores */}
        {markerPositions.slice(0, -1).map((pos, i) => {
          const next = markerPositions[i + 1];
          const gap = 7;
          const segStart = (i / (total - 1));
          const segEnd = ((i + 1) / (total - 1));
          const segProgress = Math.max(0, Math.min(1, (progress - segStart) / (segEnd - segStart)));
          const top = `${pos + gap}%`;
          const height = `${next - pos - gap * 2}%`;
          return (
            <div
              key={`neon-${i}`}
              className="hidden md:block absolute left-1/2 -translate-x-1/2 w-[2px] transition-opacity duration-75"
              style={{ top, height, opacity: segProgress }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-royal-300 via-royal-400 to-royal-500 shadow-[0_0_22px_4px_rgba(88,108,240,0.55)]" />
            </div>
          );
        })}

        {markerPositions.slice(0, -1).map((pos, i) => {
          const next = markerPositions[i + 1];
          const gap = 7;
          const segStart = (i / (total - 1));
          const segEnd = ((i + 1) / (total - 1));
          const segProgress = Math.max(0, Math.min(1, (progress - segStart) / (segEnd - segStart)));
          const top = `${pos + gap}%`;
          const height = `${next - pos - gap * 2}%`;
          return (
            <div
              key={`neon-mobile-${i}`}
              className="md:hidden absolute left-4 w-[2px] transition-opacity duration-75"
              style={{ top, height, opacity: segProgress }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-royal-300 via-royal-400 to-royal-500 shadow-[0_0_22px_4px_rgba(88,108,240,0.55)]" />
            </div>
          );
        })}

        {/* Nó neon na ponta do progresso */}
        <div
          className="hidden md:block absolute z-20 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-royal-300 shadow-[0_0_28px_8px_rgba(116,134,255,0.75)] transition-[top] duration-75 ease-linear pointer-events-none"
          style={{ top: nodeTop }}
        />
        <div
          className="md:hidden absolute z-20 left-4 -translate-x-1/2 w-4 h-4 rounded-full bg-royal-300 shadow-[0_0_28px_8px_rgba(116,134,255,0.75)] transition-[top] duration-75 ease-linear pointer-events-none"
          style={{ top: nodeTop }}
        />

        <div className="space-y-8 md:space-y-0">
          {FEATURES.map((f, i) => {
            const isLeft = i % 2 === 0;
            const isActive = i < activeCount;
            return (
              <Reveal key={f.title} delay={i * 90}>
                <div
                  data-timeline-item
                  className="relative md:grid md:grid-cols-[1fr_auto_1fr] md:items-center min-h-[120px] md:min-h-[140px]"
                >
                  {/* Marcador */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 rounded-full border transition-all duration-500 items-center justify-center md:left-1/2 md:-translate-x-1/2 left-4 ${
                      isActive
                        ? "border-royal-300/70 bg-royal-500/20 shadow-[0_0_30px_-4px_rgba(116,134,255,0.65)]"
                        : "border-royal-500/30 bg-bg-surface shadow-[0_0_24px_-8px_rgba(88,108,240,0.35)]"
                    }`}
                  >
                    <f.icon
                      className={`h-5 w-5 transition-colors duration-500 ${
                        isActive ? "text-royal-200" : "text-royal-300"
                      }`}
                    />
                  </div>

                  {/* Espaçador esquerdo no desktop */}
                  <div className="hidden md:block" />

                  {/* Card */}
                  <div
                    className={`w-full md:w-auto pl-16 md:pl-0 ${
                      isLeft ? "md:col-start-1 md:row-start-1 md:pr-12" : "md:col-start-3 md:row-start-1 md:pl-12"
                    }`}
                  >
                    <div
                      className={`rounded-xl border px-5 py-5 transition-all duration-500 ${
                        isActive
                          ? "border-royal-500/40 bg-bg-surface shadow-[0_0_40px_-12px_rgba(88,108,240,0.25)]"
                          : "border-border/60 bg-bg-surface/60 card-hover"
                      }`}
                    >
                      <h3 className="text-base font-semibold text-slate-100">
                        {f.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
