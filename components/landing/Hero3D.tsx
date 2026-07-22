"use client";

import { useEffect, useRef } from "react";
import type * as ThreeTypes from "three";

/**
 * Hero3D — "universo" da SM Hub no hero da LP.
 *
 * Tendência 2026: profundidade 3D imersiva, COM SENTIDO. Um cosmos da marca:
 * o núcleo central é o Hub; ao redor orbitam os 5 módulos da plataforma, cada
 * um com seu ícone (Clientes, Planejamento, Relatórios, Financeiro, Contratos)
 * desenhado como textura, ligados ao núcleo por linhas, sobre um starfield.
 * "SM Hub" = centro de um universo de marketing conectado.
 *
 * Posicionamento: a faixa de cima do hero (atrás do logo) — NÃO atrás do
 * título, pra não sobrepor o texto.
 *
 * Performance: three num chunk async só na LP (import() no useEffect), rAF
 * único, pausa fora da viewport/aba oculta, respeita reduced-motion (frame
 * estático), cleanup total (dispose).
 */

// SVG interno de cada ícone lucide (viewBox 24x24, traço).
const ICON_SVGS: { inner: string; color: number }[] = [
  {
    // Clientes
    inner: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    color: 0x8797ff,
  },
  {
    // Planejamento
    inner: `<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>`,
    color: 0x22d3ee,
  },
  {
    // Relatórios
    inner: `<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>`,
    color: 0x3d5afe,
  },
  {
    // Financeiro
    inner: `<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>`,
    color: 0x8797ff,
  },
  {
    // Contratos
    inner: `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>`,
    color: 0x22d3ee,
  },
];

function makeIconTexture(THREE: any, inner: string): Promise<ThreeTypes.CanvasTexture> {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const img = new Image();
  img.src = url;
  return new Promise((resolve) => {
    const done = () => {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      resolve(tex);
    };
    img.onload = done;
    img.onerror = () => {
      const c = document.createElement("canvas");
      resolve(new THREE.CanvasTexture(c));
    };
  });
}

export function Hero3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let cleanup = () => {};
    let raf = 0;

    (async () => {
      const THREE = await import("three");
      if (cancelled || !mountRef.current) return;

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
      camera.position.set(0, 0, 6.5);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";

      const universe = new THREE.Group();
      scene.add(universe);

      // --- Núcleo central (o Hub) ---
      const coreGeo = new THREE.IcosahedronGeometry(0.5, 1);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x3d5afe,
        emissive: 0x3d5afe,
        emissiveIntensity: 0.9,
        metalness: 0.4,
        roughness: 0.3,
        flatShading: true,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      universe.add(core);

      const haloGeo = new THREE.IcosahedronGeometry(0.66, 0);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x8797ff,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      universe.add(halo);

      scene.add(new THREE.AmbientLight(0x0a1a40, 1.3));
      const coreLight = new THREE.PointLight(0x3d5afe, 16, 30);
      coreLight.position.set(0, 0, 0);
      scene.add(coreLight);
      const rim = new THREE.PointLight(0x22d3ee, 7, 30);
      rim.position.set(4, 3, 3);
      scene.add(rim);

      // --- Nós = ícones dos módulos orbitando (Sprites, sempre de frente) ---
      const textures = await Promise.all(
        ICON_SVGS.map((ic) => makeIconTexture(THREE, ic.inner))
      );
      if (cancelled) return;

      type Node = {
        sprite: ThreeTypes.Sprite;
        spriteMat: ThreeTypes.SpriteMaterial;
        glow: ThreeTypes.Mesh;
        glowMat: ThreeTypes.MeshBasicMaterial;
        r: number;
        speed: number;
        tilt: number;
        phase: number;
      };
      const nodes: Node[] = [];
      const glowGeo = new THREE.SphereGeometry(0.2, 16, 16);
      for (let i = 0; i < ICON_SVGS.length; i++) {
        const spriteMat = new THREE.SpriteMaterial({
          map: textures[i],
          transparent: true,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(0.6, 0.6, 1);
        universe.add(sprite);

        const glowMat = new THREE.MeshBasicMaterial({
          color: ICON_SVGS[i].color,
          transparent: true,
          opacity: 0.22,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        universe.add(glow);

        nodes.push({
          sprite,
          spriteMat,
          glow,
          glowMat,
          r: 1.5 + (i % 3) * 0.42,
          speed: 0.16 + (i % 3) * 0.06,
          tilt: (i / ICON_SVGS.length) * Math.PI,
          phase: (i / ICON_SVGS.length) * Math.PI * 2,
        });
      }

      // --- Linhas de conexão núcleo <-> nós ---
      const linePositions = new Float32Array(nodes.length * 6);
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x8797ff,
        transparent: true,
        opacity: 0.2,
      });
      const lines = new THREE.LineSegments(lineGeo, lineMat);
      universe.add(lines);

      // --- Starfield ---
      const STAR_N = 600;
      const starPos = new Float32Array(STAR_N * 3);
      for (let i = 0; i < STAR_N; i++) {
        const r = 6 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi) - 2;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0x8797ff,
        size: 0.03,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
      });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);

      // --- Parallax/tilt do universo seguindo o mouse ---
      const target = { rx: 0, ry: 0 };
      const cur = { rx: 0, ry: 0 };
      const onPointer = (e: PointerEvent) => {
        target.ry = (e.clientX / window.innerWidth - 0.5) * 0.55;
        target.rx = (e.clientY / window.innerHeight - 0.5) * 0.35;
      };
      if (!reduce) window.addEventListener("pointermove", onPointer, { passive: true });

      let visible = true;
      const io = new IntersectionObserver(
        (entries) => {
          visible = entries[0].isIntersecting;
        },
        { threshold: 0 }
      );
      io.observe(mount);
      const onVis = () => {
        visible = !document.hidden;
      };
      document.addEventListener("visibilitychange", onVis);

      const clock = new THREE.Clock();
      const renderFrame = () => {
        const t = clock.getElapsedTime();
        cur.rx += (target.rx - cur.rx) * 0.05;
        cur.ry += (target.ry - cur.ry) * 0.05;
        universe.rotation.x = cur.rx;
        universe.rotation.y = cur.ry + t * 0.05;

        core.rotation.y = t * 0.3;
        core.rotation.x = t * 0.18;
        halo.rotation.y = -t * 0.12;

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const a = n.phase + t * n.speed;
          const x = n.r * Math.cos(a);
          const y = Math.sin(n.tilt) * n.r * Math.sin(a);
          const z = Math.cos(n.tilt) * n.r * Math.sin(a);
          n.sprite.position.set(x, y, z);
          n.glow.position.set(x, y, z);
          linePositions[i * 6] = 0;
          linePositions[i * 6 + 1] = 0;
          linePositions[i * 6 + 2] = 0;
          linePositions[i * 6 + 3] = x;
          linePositions[i * 6 + 4] = y;
          linePositions[i * 6 + 5] = z;
        }
        lineGeo.attributes.position.needsUpdate = true;

        stars.rotation.y = t * 0.02;
        renderer.render(scene, camera);
      };

      if (reduce) {
        renderFrame();
      } else {
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (!visible) return;
          renderFrame();
        };
        raf = requestAnimationFrame(loop);
      }

      const onResize = () => {
        const w = mount.clientWidth || 1;
        const h = mount.clientHeight || 1;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
        io.disconnect();
        coreGeo.dispose();
        coreMat.dispose();
        haloGeo.dispose();
        haloMat.dispose();
        glowGeo.dispose();
        nodes.forEach((n) => {
          n.spriteMat.map?.dispose();
          n.spriteMat.dispose();
          n.glowMat.dispose();
        });
        lineGeo.dispose();
        lineMat.dispose();
        starGeo.dispose();
        starMat.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={mountRef} className="hero-3d" aria-hidden />;
}