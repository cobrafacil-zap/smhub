"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  size: number;
  minOpacity: number;
  maxOpacity: number;
  phase: number;
  speed: number;
  color: string;
};

type ShootingStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
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
    let shooting: ShootingStar | null = null;
    let nextShooting = 0;
    let dpr = 1;
    const isDark = document.documentElement.classList.contains("dark");

    const colors = isDark
      ? ["#a8b4ff", "#8797ff", "#c3cfff", "#586cf0", "#ffffff"]
      : ["#6b7cff", "#8797ff", "#4f5bff", "#586cf0", "#a8b4ff"];

    const createStars = () => {
      const mobile = width < 768;
      const density = mobile ? 7000 : isDark ? 9000 : 12000;
      const count = Math.floor((width * height) / density);
      stars = [];
      for (let i = 0; i < count; i++) {
        const bright = Math.random() < 0.25;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: mobile
            ? bright
              ? 1.1 + Math.random() * 0.7
              : 0.55 + Math.random() * 0.45
            : bright
              ? 1.2 + Math.random() * 1.6
              : 0.5 + Math.random() * 0.9,
          minOpacity: bright ? 0.3 : 0.08,
          maxOpacity: bright ? 0.85 : 0.38,
          phase: Math.random() * Math.PI * 2,
          speed: 0.8 + Math.random() * 2.4,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const spawnShooting = () => {
      const startSide = Math.random() < 0.5 ? "top" : "left";
      const x = startSide === "top" ? Math.random() * width : -60;
      const y = startSide === "top" ? -60 : Math.random() * height * 0.6;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
      const speed = 6 + Math.random() * 4;
      shooting = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 40 + Math.random() * 30,
        length: 40 + Math.random() * 30,
      };
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

      // Estrelas fixas piscando
      for (const s of stars) {
        const pulse = Math.sin(now * s.speed + s.phase);
        const opacity = s.minOpacity + (s.maxOpacity - s.minOpacity) * (0.5 + 0.5 * pulse);

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = opacity;
        ctx.shadowBlur = s.size * 4;
        ctx.shadowColor = s.color;
        ctx.fill();
      }

      // Estrela cadente rara
      if (!shooting && now > nextShooting) {
        spawnShooting();
        // próxima entre 6 e 18 segundos
        nextShooting = now + 6 + Math.random() * 12;
      }

      if (shooting) {
        shooting.life++;
        shooting.x += shooting.vx;
        shooting.y += shooting.vy;
        const progress = shooting.life / shooting.maxLife;
        const opacity = progress < 0.15 ? progress / 0.15 : Math.max(0, 1 - (progress - 0.15) / 0.85);

        const tailX = shooting.x - shooting.vx * (shooting.length / shooting.vx);
        const tailY = shooting.y - shooting.vy * (shooting.length / shooting.vy);

        const grad = ctx.createLinearGradient(shooting.x, shooting.y, tailX, tailY);
        grad.addColorStop(0, "rgba(191, 212, 255, " + opacity + ")");
        grad.addColorStop(1, "rgba(191, 212, 255, 0)");

        ctx.beginPath();
        ctx.moveTo(shooting.x, shooting.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#bfd4ff";
        ctx.stroke();

        if (shooting.life >= shooting.maxLife || shooting.x > width + 100 || shooting.y > height + 100) {
          shooting = null;
        }
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
