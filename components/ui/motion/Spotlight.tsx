"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Spotlight — wrapper que aplica a utility `.spotlight` e seta --mx/--my
 * (0..100%) seguindo o cursor no hover. Brilho radial sutil e premium em
 * cards/itens de destaque. Só ativa com pointer fino + sem reduced-motion;
 * caso contrário renderiza sem wrapper (não quebra layout).
 */
interface SpotlightProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

export function Spotlight({ children, className, as }: SpotlightProps) {
  const Tag = (as ?? "div") as ElementType;
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

  const apply = () => {
    raf.current = null;
    const el = ref.current;
    const v = next.current;
    if (!el || !v) return;
    el.style.setProperty("--mx", `${v.x}%`);
    el.style.setProperty("--my", `${v.y}%`);
  };

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    next.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
    if (raf.current == null) raf.current = requestAnimationFrame(apply);
  };

  if (!enabled) return <>{children}</>;

  return (
    <Tag
      ref={ref}
      onPointerMove={onMove}
      className={cn("spotlight", className)}
    >
      {children}
    </Tag>
  );
}