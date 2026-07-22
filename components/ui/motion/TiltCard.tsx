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
 * TiltCard — inclinação 3D leve (~6°) seguindo o cursor, com brilho (glare)
 * que acompanha o ponteiro. Atualiza variáveis CSS (--rx/--ry/--gx/--gy) em
 * requestAnimationFrame para evitar thrash.
 *
 * Só ativa com ponteiro fino (mouse) — dispositivos de toque (pointer:coarse)
 * não fazem tilt. Respeita prefers-reduced-motion (sem transform).
 *
 * Uso:
 *   <TiltCard className="...">...</TiltCard>
 *   <TiltCard as="div" max={6} glare>...</TiltCard>
 */

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Inclinação máxima em graus (default 6). */
  max?: number;
  /** Renderiza o overlay de brilho (default true). */
  glare?: boolean;
  /** Tag renderizada (default div). */
  as?: ElementType;
}

export function TiltCard({
  children,
  className,
  max = 6,
  glare = true,
  as,
}: TiltCardProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const raf = useRef<number | null>(null);
  const next = useRef<{ rx: number; ry: number; gx: number; gy: number } | null>(
    null
  );
  // Tilt só com ponteiro fino e sem reduced-motion. Caso contrário renderiza
  // como wrapper neutro (sem transform/handlers).
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
    el.style.setProperty("--rx", `${v.rx.toFixed(2)}deg`);
    el.style.setProperty("--ry", `${v.ry.toFixed(2)}deg`);
    el.style.setProperty("--gx", `${v.gx}%`);
    el.style.setProperty("--gy", `${v.gy}%`);
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height; // 0..1
      // ry positivo inclina para a direita quando cursor à direita; rx negativo
      // quando cursor embaixo (para "olhar" o cursor).
      next.current = {
        ry: (px - 0.5) * 2 * max,
        rx: -(py - 0.5) * 2 * max,
        gx: px * 100,
        gy: py * 100,
      };
      if (raf.current == null) raf.current = requestAnimationFrame(apply);
    },
    [apply, max]
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
    next.current = null;
    // Reset suave (a transição .tilt-3d-leave cuida da suavidade).
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, []);

  return (
    <Tag
      ref={ref}
      onPointerMove={enabled ? onMove : undefined}
      onPointerLeave={enabled ? onLeave : undefined}
      className={cn(
        enabled ? "tilt-3d group/tilt" : "",
        "relative",
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
      {glare && enabled && <span className="glare" aria-hidden />}
    </Tag>
  );
}