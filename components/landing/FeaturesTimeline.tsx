"use client";

import { useRef } from "react";
import { Users, CalendarDays, TrendingUp, Wallet, FileText, UserCog, LucideIcon } from "lucide-react";
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

export function FeaturesTimeline() {
  const lineRef = useRef<HTMLDivElement>(null);

  return (
    <section id="funcionalidades" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 scroll-mt-20">
      <div className="text-center mb-12 sm:mb-16">
        <p className="text-xs text-slate-500 font-medium">Funcionalidades</p>
        <h2 className="text-2xl sm:text-4xl font-bold mt-2">
          Do briefing ao fechamento
        </h2>
        <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
          Cada etapa da operação da sua agência em um só fluxo, sem planilhas soltas.
        </p>
      </div>

      <div className="relative">
        {/* Linha central — desktop */}
        <div
          ref={lineRef}
          className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-royal-500/40 to-transparent" />
          <div className="absolute inset-0 bg-royal-500/20" />
        </div>

        {/* Linha central — mobile */}
        <div className="md:hidden absolute left-4 top-0 bottom-0 w-px">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-royal-500/40 to-transparent" />
          <div className="absolute inset-0 bg-royal-500/20" />
        </div>

        <div className="space-y-8 md:space-y-12">
          {FEATURES.map((f, i) => {
            const isLeft = i % 2 === 0;
            return (
              <Reveal key={f.title} delay={i * 90}>
                <div className="relative flex items-center md:items-start">
                  {/* Marcador */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 rounded-full border border-royal-500/30 bg-bg-surface shadow-[0_0_24px_-8px_rgba(88,108,240,0.35)] items-center justify-center md:left-1/2 md:-translate-x-1/2 left-4`}
                  >
                    <f.icon className="h-5 w-5 text-royal-300" />
                  </div>

                  {/* Card */}
                  <div
                    className={`w-full md:w-[45%] pl-16 md:pl-0 ${
                      isLeft ? "md:pr-12" : "md:ml-auto md:pl-12"
                    }`}
                  >
                    <div className="rounded-xl border border-border/60 bg-bg-surface/60 px-5 py-5 card-hover">
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
