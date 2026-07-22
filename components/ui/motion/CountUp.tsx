"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * CountUp — anima um número de 0 até `value` quando entra na viewport.
 * Usa rAF + easing (easeOutExpo). Formata em pt-BR (separador de milhar "." e
 * decimal ","). Respeita prefers-reduced-motion (mostra o valor final direto).
 *
 * Reaproveita o mesmo padrão do Reveal (IntersectionObserver), mas local (1 obs
 * por instância é aceitável — CountUp é usado em poucos KPIs por tela).
 */
function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function formatBR(n: number, decimals = 0) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

interface CountUpProps {
  /** Valor final. */
  value: number;
  /** Duracao em ms (default 1200). */
  duration?: number;
  /** Casas decimais (default 0). */
  decimals?: number;
  /** Prefixo (ex.: "R$ "). */
  prefix?: string;
  /** Sufixo (ex.: " %" ou "k"). */
  suffix?: string;
  className?: string;
}

export function CountUp({
  value,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      started.current = true;
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const from = 0;
            const to = value;
            const tick = (now: number) => {
              const p = Math.min((now - start) / duration, 1);
              setDisplay(from + (to - from) * easeOutExpo(p));
              if (p < 1) requestAnimationFrame(tick);
              else setDisplay(to);
            };
            requestAnimationFrame(tick);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={cn(className)}>
      {prefix}
      {formatBR(display, decimals)}
      {suffix}
    </span>
  );
}