"use client";

import { useEffect, useRef, useState } from "react";
import {
  UserPlus,
  Users,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/ui/motion/Reveal";
import { TiltCard } from "@/components/ui/motion/TiltCard";

const STEPS: {
  n: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  {
    n: "01",
    title: "Crie sua conta",
    desc: "Cadastre-se em segundos e comece seu trial de 7 dias sem cartão de crédito.",
    icon: UserPlus,
  },
  {
    n: "02",
    title: "Importe seus clientes",
    desc: "Adicione clientes, equipe e configure planejamentos editoriais em poucos cliques.",
    icon: Users,
  },
  {
    n: "03",
    title: "Entregue mais resultados",
    desc: "Gere relatórios, contratos e faturas automáticas. Tudo centralizado em um só lugar.",
    icon: Rocket,
  },
];

function useStepsProgress(sectionRef: React.RefObject<HTMLElement | null>) {
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
        const start = rect.top - vh * 0.75;
        const end = rect.bottom - vh * 0.25;
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

export function StepsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useStepsProgress(sectionRef);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let raf: number | null = null;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const vh = window.innerHeight;
        const threshold = vh * 0.55;
        const items = sectionRef.current?.querySelectorAll("[data-step]") ?? [];
        let idx = 0;
        items.forEach((el, i) => {
          if (el.getBoundingClientRect().top < threshold) idx = i;
        });
        setActive(idx);
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

  return (
    <section
      ref={sectionRef}
      className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20"
    >
      <div className="text-center mb-12 sm:mb-16">
        <p className="text-xs text-slate-500 font-medium">Como funciona</p>
        <h2 className="text-2xl sm:text-4xl font-bold mt-2">
          Três passos pra começar
        </h2>
      </div>

      <div className="relative">
        {/* Conector de fundo — linha tracejada neon */}
        <div
          className="absolute top-0 left-8 sm:left-1/2 sm:-translate-x-1/2 bottom-0 w-px z-0 hidden sm:block"
          aria-hidden
        >
          <div className="absolute inset-0 bg-royal-500/15" />
          <div
            className="absolute top-0 left-0 w-full bg-gradient-to-b from-royal-300 via-royal-400 to-royal-500 transition-[height] duration-100 ease-linear"
            style={{ height: `${progress * 100}%` }}
          />
        </div>

        {/* Conector mobile — linha vertical à esquerda */}
        <div
          className="absolute top-0 left-8 bottom-0 w-px z-0 sm:hidden"
          aria-hidden
        >
          <div className="absolute inset-0 bg-royal-500/15" />
          <div
            className="absolute top-0 left-0 w-full bg-gradient-to-b from-royal-300 via-royal-400 to-royal-500 transition-[height] duration-100 ease-linear"
            style={{ height: `${progress * 100}%` }}
          />
        </div>

        <div className="space-y-10 sm:space-y-16">
          {STEPS.map((s, i) => {
            const isActive = i <= active;
            const isCurrent = i === active;
            const Icon = s.icon;
            const isLeft = i % 2 === 0;

            return (
              <Reveal key={s.n} delay={i * 120}>
                <div
                  data-step
                  className={`relative grid sm:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-0 ${
                    isLeft ? "" : "sm:direction-rtl"
                  }`}
                >
                  {/* Marcador grande com ícone */}
                  <div className="absolute left-8 sm:left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10">
                    <div
                      className={`relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border transition-all duration-500 ${
                        isActive
                          ? "border-royal-300/60 bg-royal-500/15 shadow-[0_0_36px_-6px_rgba(116,134,255,0.55)]"
                          : "border-royal-500/20 bg-bg-surface/80 shadow-[0_0_24px_-8px_rgba(88,108,240,0.3)]"
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors duration-500 ${
                          isActive ? "text-royal-200" : "text-royal-300/70"
                        }`}
                      />
                      {isCurrent && (
                        <span className="absolute inset-0 rounded-2xl border border-royal-300/40 animate-ping opacity-60" />
                      )}
                    </div>
                  </div>

                  {/* Card */}
                  <div
                    className={`pl-20 sm:pl-0 ${
                      isLeft
                        ? "sm:col-start-1 sm:row-start-1 sm:pr-16 sm:text-right"
                        : "sm:col-start-3 sm:row-start-1 sm:pl-16 sm:text-left"
                    }`}
                  >
                    <TiltCard
                      as="div"
                      max={4}
                      glare={false}
                      className={`rounded-2xl border px-5 py-5 sm:px-6 sm:py-6 transition-all duration-500 ${
                        isActive
                          ? "border-royal-500/35 bg-bg-surface shadow-[0_0_44px_-12px_rgba(88,108,240,0.28)]"
                          : "border-border/60 bg-bg-surface/60 card-hover"
                      }`}
                    >
                      <span
                        className={`inline-block text-xs font-bold tracking-wider mb-2 transition-colors duration-500 ${
                          isActive ? "text-royal-300" : "text-slate-600"
                        }`}
                      >
                        PASSO {s.n}
                      </span>
                      <h3 className="text-lg sm:text-xl font-semibold text-slate-100">
                        {s.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                        {s.desc}
                      </p>
                    </TiltCard>
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
