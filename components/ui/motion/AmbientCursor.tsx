"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AmbientCursor — uma única luz royal (radial) que segue o cursor por toda a
 * viewport. Montada uma vez no RootLayout, dá vida ao site sem precisar passar
 * o mouse em cada elemento. Subtle e premium (o toque "vivo" de 2026 sem
 * gadget).
 *
 * - Só ativa com ponteiro fino (mouse) + sem reduced-motion.
 * - rAF + throttle: só atualiza --ax/--ay no frame de animação (sem thrash).
 * - z-index 0, pointer-events none → não bloqueia cliques nem atrapalha leitura.
 */
export function AmbientCursor() {
  const ref = useRef<HTMLDivElement | null>(null);
  const raf = useRef<number | null>(null);
  const next = useRef<{ x: number; y: number } | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && !reduce);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const apply = () => {
      raf.current = null;
      const el = ref.current;
      const v = next.current;
      if (!el || !v) return;
      el.style.setProperty("--ax", `${v.x}px`);
      el.style.setProperty("--ay", `${v.y}px`);
    };
    const onMove = (e: PointerEvent) => {
      next.current = { x: e.clientX, y: e.clientY };
      if (raf.current == null) raf.current = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={ref} className="ambient-cursor" aria-hidden />;
}