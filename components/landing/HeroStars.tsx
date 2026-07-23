"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  minOpacity: number;
  maxOpacity: number;
  phase: number;
  speed: number;
  color: string;
};

export function HeroStars() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let dpr = 1;

    const colors = ["#a8b4ff", "#8797ff", "#c3cfff", "#586cf0", "#ffffff"];

    const createStars = () => {
      const count = Math.floor((width * height) / 9000);
      stars = [];
      for (let i = 0; i < count; i++) {
        const bright = Math.random() < 0.25;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: bright ? 1.2 + Math.random() * 1.6 : 0.5 + Math.random() * 0.9,
          opacity: Math.random(),
          minOpacity: bright ? 0.35 : 0.05,
          maxOpacity: bright ? 0.95 : 0.4,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.8,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createStars();
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const now = performance.now() / 1000;
      ctx.clearRect(0, 0, width, height);

      for (const s of stars) {
        const pulse = Math.sin(now * s.speed + s.phase);
        s.opacity = s.minOpacity + (s.maxOpacity - s.minOpacity) * (0.5 + 0.5 * pulse);

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.opacity;
        ctx.shadowBlur = s.size * 4;
        ctx.shadowColor = s.color;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
    />
  );
}
