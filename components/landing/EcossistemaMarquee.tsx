"use client";

/**
 * Carrossel horizontal de logos em loop infinito.
 *
 * Estratégia: renderiza a lista 2x lado a lado dentro de um container
 * com `overflow-hidden`, e aplica uma animação CSS `translateX(0 → -50%)`
 * em loop. Como a segunda metade é idêntica à primeira, quando termina
 * o ciclo o efeito visual é contínuo (sem "pulo").
 *
 * Pausa ao passar o mouse (`hover:pause`) para o usuário conseguir ler.
 */

import {
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  type LucideIcon,
} from "lucide-react";

interface LogoItem {
  nome: string;
  /** Lucide icon. */
  Icon: LucideIcon;
  /** Cor da marca em HEX/classe Tailwind. */
  cor: string;
}

const LOGOS: LogoItem[] = [
  { nome: "Instagram", Icon: Instagram, cor: "text-slate-300" },
  { nome: "Facebook", Icon: Facebook, cor: "text-slate-300" },
  { nome: "YouTube", Icon: Youtube, cor: "text-slate-300" },
  { nome: "LinkedIn", Icon: Linkedin, cor: "text-slate-300" },
  { nome: "X (Twitter)", Icon: Twitter, cor: "text-slate-300" },
];

export function EcossistemaMarquee() {
  return (
    <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)] sm:[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee gap-6 sm:gap-12 pause-on-hover">
        {/* primeira passada */}
        {LOGOS.map((l) => (
          <LogoPill key={`a-${l.nome}`} item={l} />
        ))}
        {/* segunda passada (clone para loop invisível) */}
        {LOGOS.map((l) => (
          <LogoPill key={`b-${l.nome}`} item={l} />
        ))}
      </div>
    </div>
  );
}

function LogoPill({ item }: { item: LogoItem }) {
  return (
    <div className="flex items-center gap-2 px-4 sm:px-5 py-3 rounded-lg bg-bg-elevated/40 border border-border/60 shrink-0 min-w-[150px] sm:min-w-[180px] justify-center hover:border-royal-500/30 transition-colors duration-300">
      <item.Icon className={`h-5 w-5 ${item.cor}`} />
      <span className="text-sm text-slate-400 whitespace-nowrap">
        {item.nome}
      </span>
    </div>
  );
}
