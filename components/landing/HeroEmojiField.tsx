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
      const size = isCoarse ? 0.4 + Math.random() * 0.45 : 0.6 + Math.random() * 0.9;
      el.style.fontSize = `${size}rem`;
      el.style.color = color;
      el.style.textShadow = `0 0 8px ${color}, 0 0 16px ${color}`;
      el.style.opacity = "0";
      container.appendChild(el);

      const angle = Math.random() * Math.PI * 2;
      const speed = isCoarse ? 0.2 + Math.random() * 0.5 : 0.3 + Math.random() * 0.8;

      particles.push({
        el,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: isCoarse ? 40 + Math.random() * 40 : 24 + Math.random() * 28,
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
      if (now - lastSpawn > 50) {
        lastSpawn = now;
        // Só cria se estiver na área de fundo (evita poluir o texto central).
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const distFromCenter = Math.hypot(x - centerX, y - centerY);
        if (distFromCenter > Math.min(rect.width, rect.height) * 0.18) {
          spawn(x, y);
          // Chance de spawn duplo/triplo para mais movimento
          if (Math.random() < 0.45) spawn(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
          if (Math.random() < 0.2) spawn(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);

    const tick = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(tick);

      // No mobile, gera uma estrela a cada intervalo, focada na área visível superior
      if (isCoarse) {
        const now = performance.now();
        if (now - lastSpawn > 1400) {
          lastSpawn = now;
          const rect = container.getBoundingClientRect();
          const centerX = rect.width / 2;
          // Foca na metade superior da tela mobile (onde o anel/logo aparece)
          const y = rect.height * (0.12 + Math.random() * 0.38);
          const xSpread = rect.width * 0.42;
          const x = centerX + (Math.random() - 0.5) * xSpread;
          spawn(x, y);
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
        const twinkle = 0.7 + 0.3 * Math.sin(progress * Math.PI * 3);
        const opacity = progress < 0.2
          ? (progress / 0.2) * 0.6
          : Math.max(0, 1 - (progress - 0.2) / 0.8) * 0.6 * twinkle;

        p.el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${1 - progress * 0.2}) rotate(${progress * 90}deg)`;
        p.el.style.opacity = String(opacity);

        if (p.life >= p.maxLife) {
          p.el.remove();
          particles.splice(i, 1);
        }
      }
    };

    if (!isCoarse) {
      container.addEventListener("mousemove", onMouseMove, { passive: true });
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      container.removeEventListener("mousemove", onMouseMove);
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
