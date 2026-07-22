"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Magnetic — translada levemente (±4px) o filho em direção ao cursor no hover.
 * Para CTAs de destaque. Só ativa com ponteiro fino; respeita reduced-motion.
 * Atualiza em rAF para evitar thrash.
 */

interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** Deslocamento máximo em px (default 4). */
  strength?: number;
  as?: ElementType;
}

export function Magnetic({
  children,
  className,
  strength = 4,
  as,
}: MagneticProps) {
  const Tag = (as ?? "span") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const raf = useRef<number | null>(null);
  const next = useRef<{ x: number; y: number } | null>(null);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && !reduce);
  }, []);

  const apply = useCallback(() => {
    raf.current = null;
    const el = ref.current;
    const v = next.current;
    if (!el || !v) return;
    el.style.transform = `translate3d(${v.x}px, ${v.y}px, 0)`;
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const hx = e.clientX - (rect.left + rect.width / 2);
      const hy = e.clientY - (rect.top + rect.height / 2);
      const nx = (hx / (rect.width / 2)) * strength;
      const ny = (hy / (rect.height / 2)) * strength;
      next.current = { x: nx, y: ny };
      if (raf.current == null) raf.current = requestAnimationFrame(apply);
    },
    [apply, strength]
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
    next.current = null;
    el.style.transform = "translate3d(0,0,0)";
  }, []);

  // Desabilitado (toque / reduced-motion / pré-hidratação): sem wrapper, para
  // não quebrar layout de botões full-width no mobile.
  if (!enabled) return <>{children}</>;

  return (
    <Tag
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        "inline-flex transition-transform duration-200 ease-out will-change-transform",
        className
      )}
      style={{ transform: "translate3d(0,0,0)" }}
    >
      {children}
    </Tag>
  );
}