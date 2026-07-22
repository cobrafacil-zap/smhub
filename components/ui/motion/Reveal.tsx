"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveal — fade/slide-in suave quando o elemento entra na viewport.
 *
 * Usa um único IntersectionObserver compartilhado (mapa el→callback) em vez
 * de 1 observer por instância — leve mesmo com dezenas de itens em cascade.
 * O delay (ms) vira `transition-delay` inline; o cascade é só CSS depois.
 * Respeita prefers-reduced-motion (a utilidade `.reveal` já é neutralizada
 * globalmente, mas garantimos o estado inicial visível via JS).
 */

type ObserverEntry = (inView: boolean) => void;

let sharedObserver: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, ObserverEntry>();

function getObserver(): IntersectionObserver {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cb = callbacks.get(entry.target);
        if (!cb) continue;
        cb(entry.isIntersecting);
        // Depois de visível (e once=true por padrão no caller), paramos de
        // observar — o caller remove do observer.
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
  );
  return sharedObserver;
}

interface RevealProps {
  children: ReactNode;
  /** Tag renderizada (default: div). */
  as?: ElementType;
  /** Delay em ms — vira transition-delay. */
  delay?: number;
  /** Se true (default), só anima uma vez e para de observar. */
  once?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Reveal({
  children,
  as,
  delay = 0,
  once = true,
  className,
  style,
}: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion: mostra direto, sem observar.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setInView(true);
      return;
    }
    const obs = getObserver();
    callbacks.set(el, (visible) => {
      if (visible) {
        setInView(true);
        if (once) {
          obs.unobserve(el);
          callbacks.delete(el);
        }
      } else if (!once) {
        setInView(false);
      }
    });
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      callbacks.delete(el);
    };
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", inView && "reveal-in", className)}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}