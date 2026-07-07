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
  { nome: "Instagram", Icon: Instagram, cor: "text-pink-400" },
  { nome: "Facebook", Icon: Facebook, cor: "text-blue-400" },
  { nome: "YouTube", Icon: Youtube, cor: "text-red-400" },
  { nome: "LinkedIn", Icon: Linkedin, cor: "text-sky-400" },
  { nome: "X (Twitter)", Icon: Twitter, cor: "text-slate-300" },
];

export function EcossistemaMarquee() {
  return (
    <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee gap-12 hover:[animation-play-state:paused]">
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
    <div className="flex items-center gap-2 px-5 py-3 rounded-lg bg-bg-elevated/40 border border-border/60 shrink-0 min-w-[180px] justify-center">
      <item.Icon className={`h-6 w-6 ${item.cor}`} />
      <span className="text-sm font-semibold text-slate-300 whitespace-nowrap">
        {item.nome}
      </span>
    </div>
  );
}
