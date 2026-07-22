"use client";

import { useEffect, useRef } from "react";

const EMOJIS = ["✨", "💡", "⚡", "🔥"];

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
 * HeroEmojiField — flares bem esparsos que surgem perto do cursor no hero.
 * Poucos, pequenos, longe do texto. Só desktop.
 */
export function HeroEmojiField() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const particles: Particle[] = [];
    let lastSpawn = 0;
    let raf = 0;
    let cancelled = false;

    const spawn = (x: number, y: number) => {
      const el = document.createElement("span");
      el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      el.className = "absolute text-sm pointer-events-none select-none";
      el.style.left = "0";
      el.style.top = "0";
      el.style.filter = "drop-shadow(0 0 5px rgba(88,108,240,0.45))";
      el.style.opacity = "0";
      container.appendChild(el);

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      const speed = 0.5 + Math.random() * 0.9;

      particles.push({
        el,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 35 + Math.random() * 30,
      });
    };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const now = performance.now();
      if (now - lastSpawn > 160) {
        lastSpawn = now;
        // Só cria se estiver na área de fundo (evita poluir o texto central).
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const distFromCenter = Math.hypot(x - centerX, y - centerY);
        if (distFromCenter > Math.min(rect.width, rect.height) * 0.25) {
          spawn(x, y);
        }
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
        const opacity = progress < 0.12
          ? progress / 0.12
          : Math.max(0, 1 - (progress - 0.12) / 0.88);

        p.el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${1 - progress * 0.25})`;
        p.el.style.opacity = String(opacity * 0.7);

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
