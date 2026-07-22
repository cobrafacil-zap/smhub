"use client";

import { useEffect, useRef } from "react";

const EMOJIS = ["✨", "🚀", "💡", "⚡", "🔥", "🎯", "📈", "💼"];

interface Particle {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/**
 * HeroEmojiField — pequenos emojis/flares que surgem perto do cursor no hero,
 * flutuam para cima e desaparecem. Efeito sutil, sem roubar atenção do conteúdo.
 */
export function HeroEmojiField() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Só ativa em dispositivos com mouse preciso.
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const particles: Particle[] = [];
    let lastSpawn = 0;
    let raf = 0;
    let cancelled = false;

    const spawn = (x: number, y: number) => {
      const el = document.createElement("span");
      el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      el.className = "absolute text-base pointer-events-none select-none";
      el.style.left = "0";
      el.style.top = "0";
      el.style.filter = "drop-shadow(0 0 6px rgba(88,108,240,0.6))";
      el.style.opacity = "0";
      container.appendChild(el);

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 0.6 + Math.random() * 1.2;

      particles.push({
        el,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 40 + Math.random() * 40,
      });
    };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const now = performance.now();
      if (now - lastSpawn > 80) {
        lastSpawn = now;
        spawn(x, y);
      }
    };

    const tick = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(tick);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;

        const progress = p.life / p.maxLife;
        const opacity = progress < 0.15
          ? progress / 0.15
          : Math.max(0, 1 - (progress - 0.15) / 0.85);

        p.el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${1 - progress * 0.3})`;
        p.el.style.opacity = String(opacity * 0.85);

        if (p.life >= p.maxLife) {
          p.el.remove();
          particles.splice(i, 1);
        }
      }
    };

    container.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      container.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      particles.forEach((p) => p.el.remove());
      particles.length = 0;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[1] pointer-events-auto overflow-hidden"
      aria-hidden
    />
  );
}
