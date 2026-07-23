"use client";

import { useEffect, useRef } from "react";

interface Particle {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

/**
 * HeroEmojiField — pequenas estrelas que surgem perto do cursor no hero.
 * Cores azul/neon, piscam suavemente e desaparecem. Desktop e mobile.
 */
export function HeroEmojiField() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const particles: Particle[] = [];
    let lastSpawn = 0;
    let raf = 0;
    let cancelled = false;
    let lastX = container.clientWidth / 2;
    let lastY = container.clientHeight / 2;

    const colors = ["#a8b4ff", "#8797ff", "#c3cfff", "#ffffff", "#bfd4ff"];

    const spawn = (x: number, y: number) => {
      const el = document.createElement("span");
      el.textContent = "✦";
      el.className = "absolute pointer-events-none select-none";
      el.style.left = "0";
      el.style.top = "0";
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 0.6 + Math.random() * 0.9;
      el.style.fontSize = `${size}rem`;
      el.style.color = color;
      el.style.textShadow = `0 0 8px ${color}, 0 0 16px ${color}`;
      el.style.opacity = "0";
      container.appendChild(el);

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.8;

      particles.push({
        el,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 40 + Math.random() * 40,
        size,
      });
    };

    const onMove = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      lastX = x;
      lastY = y;

      const now = performance.now();
      if (now - lastSpawn > 120) {
        lastSpawn = now;
        // Só cria se estiver na área de fundo (evita poluir o texto central).
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const distFromCenter = Math.hypot(x - centerX, y - centerY);
        if (distFromCenter > Math.min(rect.width, rect.height) * 0.22) {
          spawn(x, y);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) onMove(touch.clientX, touch.clientY);
    };

    const tick = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(tick);

      // No mobile, gera uma estrela perto do centro a cada intervalo para manter a vibe
      if (isCoarse) {
        const now = performance.now();
        if (now - lastSpawn > 350) {
          lastSpawn = now;
          const rect = container.getBoundingClientRect();
          const angle = Math.random() * Math.PI * 2;
          const r = Math.min(rect.width, rect.height) * (0.28 + Math.random() * 0.3);
          spawn(rect.width / 2 + Math.cos(angle) * r, rect.height / 2 + Math.sin(angle) * r);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;

        const progress = p.life / p.maxLife;
        const twinkle = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);
        const opacity = progress < 0.15
          ? (progress / 0.15) * 0.7
          : Math.max(0, 1 - (progress - 0.15) / 0.85) * 0.7 * twinkle;

        p.el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${1 - progress * 0.2}) rotate(${progress * 90}deg)`;
        p.el.style.opacity = String(opacity);

        if (p.life >= p.maxLife) {
          p.el.remove();
          particles.splice(i, 1);
        }
      }
    };

    if (isCoarse) {
      container.addEventListener("touchmove", onTouchMove, { passive: true });
    } else {
      container.addEventListener("mousemove", onMouseMove, { passive: true });
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("touchmove", onTouchMove);
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
