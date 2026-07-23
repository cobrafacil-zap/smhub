"use client";

import { useEffect, useRef, useState } from "react";
import {
  UserPlus,
  Users,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/ui/motion/Reveal";

const STEPS: {
  n: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}[] = [
  {
    n: "01",
    title: "Crie sua conta",
    desc: "Cadastre-se em segundos e comece seu trial de 7 dias sem cartão de crédito.",
    icon: UserPlus,
    color: "from-royal-400 to-royal-600",
  },
  {
    n: "02",
    title: "Importe seus clientes",
    desc: "Adicione clientes, equipe e configure planejamentos editoriais em poucos cliques.",
    icon: Users,
    color: "from-violet-400 to-royal-600",
  },
  {
    n: "03",
    title: "Entregue mais resultados",
    desc: "Gere relatórios, contratos e faturas automáticas. Tudo centralizado em um só lugar.",
    icon: Rocket,
    color: "from-royal-300 to-violet-500",
  },
];

export function StepsSection() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [lineProgress, setLineProgress] = useState(0);

  useEffect(() => {
    let raf: number | null = null;
    const handle = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const start = rect.top - vh * 0.7;
        const end = rect.bottom - vh * 0.3;
        const range = end - start;
        const value = range <= 0 ? 1 : Math.max(0, Math.min(1, -start / range));
        setLineProgress(value);
      });
    };

    handle();
    window.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle, { passive: true });
    return () => {
      window.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12"
    >
      <div className="text-center mb-6 sm:mb-8">
        <p className="text-xs text-slate-500 font-medium">Como funciona</p>
        <h2 className="text-2xl sm:text-3xl font-bold mt-1.5">
          Três passos pra começar
        </h2>
      </div>

      {/* Accordion horizontal de passos */}
      <Reveal delay={100}>
        <div className="hidden sm:flex h-[200px] gap-3 group/steps"
        >
          {STEPS.map((s, i) => {
            const isActive = active === i;
            const Icon = s.icon;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                className={`relative overflow-hidden rounded-3xl border transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] text-left ${
                  isActive
                    ? "flex-[3] border-royal-500/30 bg-bg-surface"
                    : "flex-1 border-border/60 bg-bg-surface/50 hover:border-royal-500/25 hover:bg-bg-surface/70"
                }`}
              >
                {/* Faixa de cor na lateral */}
                <div
                  className={`absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b ${s.color} transition-all duration-700 ${
                    isActive ? "opacity-100" : "opacity-40 group-hover/steps:opacity-70"
                  }`}
                />

                <div className="relative h-full flex flex-col justify-between p-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 rounded-lg items-center justify-center transition-all duration-500 bg-gradient-to-br ${s.color}`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 tracking-widest">
                      {s.n}
                    </span>
                  </div>

                  <div className={`transition-all duration-700 ${isActive ? "opacity-100 translate-y-0" : "opacity-80 translate-y-4"}`}>
                    <h3 className={`font-semibold text-slate-100 transition-all duration-500 ${isActive ? "text-lg" : "text-xs whitespace-nowrap [writing-mode:vertical-rl] rotate-180"}`}>
                      {s.title}
                    </h3>
                    <p className={`text-[11px] text-slate-400 mt-1.5 leading-relaxed transition-all duration-700 ${isActive ? "opacity-100 max-h-28" : "opacity-0 max-h-0 overflow-hidden"}`}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* Mobile: cards empilhados com expansão */}
      <div className="sm:hidden space-y-3">
        {STEPS.map((s, i) => {
          const isActive = active === i;
          const Icon = s.icon;
          return (
            <Reveal key={s.n} delay={i * 100}>
              <button
                type="button"
                onClick={() => setActive(isActive ? -1 : i)}
                className={`w-full rounded-2xl border text-left transition-all duration-500 ${
                  isActive
                    ? "border-royal-500/30 bg-bg-surface shadow-[0_0_40px_-12px_rgba(88,108,240,0.22)]"
                    : "border-border/60 bg-bg-surface/60"
                }`}
              >
                <div className="relative flex items-center gap-4 p-4"
                >
                  <div
                    className={`flex h-11 w-11 rounded-xl items-center justify-center bg-gradient-to-br ${s.color}`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-500 tracking-widest">
                      PASSO {s.n}
                    </span>
                    <h3 className="text-base font-semibold text-slate-100">
                      {s.title}
                    </h3>
                  </div>
                  <span className={`text-royal-300 transition-transform duration-300 ${isActive ? "rotate-180" : ""}`}>
                    ↓
                  </span>
                </div>
                <div
                  className={`overflow-hidden transition-all duration-500 ${isActive ? "max-h-40" : "max-h-0"}`}
                >
                  <p className="px-4 pb-4 text-sm text-slate-400 leading-relaxed">
                    {s.desc}
                  </p>
                </div>              </button>
            </Reveal>
          );
        })}
      </div>

      {/* Linha de progresso horizontal */}
      <div className="mt-7 hidden sm:block">
        <div className="relative h-1 rounded-full bg-border overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-royal-300 via-royal-400 to-royal-500 transition-[width] duration-100 ease-linear"
            style={{ width: `${lineProgress * 100}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>Começo</span>
          <span>Começando agora</span>
          <span>Resultado</span>
        </div>
      </div>
    </section>
  );
}
