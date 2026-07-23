"use client";

import { useEffect, useRef } from "react";
import type * as ThreeTypes from "three";

/**
 * Hero3D — universo sutil da SM Hub atrás do logo.
 *
 * Anel calmo com ícones orbitando lentamente, linhas finas ligando ao centro
 * e um starfield discreto. Sem interação de mouse, sem neon piscante.
 */

const ICON_SVGS: string[] = [
  // Clientes
  `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  // Planejamento
  `<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>`,
  // Relatórios
  `<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>`,
  // Financeiro
  `<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>`,
  // Contratos
  `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>`,
];

function makeIconTexture(THREE: any, inner: string): Promise<ThreeTypes.CanvasTexture> {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#AEB9D6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
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
      const isMobile = width < 768;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
      camera.position.set(0, 0, isMobile ? 9.5 : 7.2);

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
      universe.position.set(0, isMobile ? 3.65 : 2.45, isMobile ? -1.6 : -2.2);
      scene.add(universe);

      // Iluminação ambiente + neon sutil
      scene.add(new THREE.AmbientLight(0x0b0f19, 1.2));
      const coreLight = new THREE.PointLight(0x586cf0, 14, 30);
      coreLight.position.set(0, 0, 0);
      scene.add(coreLight);
      const neonLight = new THREE.PointLight(0x8797ff, 6, 25);
      neonLight.position.set(0, -2, 2);
      scene.add(neonLight);

      // Anel central orbitando o SM Hub — maior que o logo
      const ringGeo = new THREE.TorusGeometry(isMobile ? 1.55 : 2.6, isMobile ? 0.045 : 0.048, 20, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x7486ff,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      universe.add(ring);

      // Ícones orbitando
      const textures = await Promise.all(
        ICON_SVGS.map((inner) => makeIconTexture(THREE, inner))
      );
      if (cancelled) return;

      type Node = {
        sprite: ThreeTypes.Sprite;
        glow: ThreeTypes.Mesh;
        r: number;
        speed: number;
        tilt: number;
        phase: number;
      };
      const nodes: Node[] = [];
      const glowGeo = new THREE.SphereGeometry(0.18, 20, 20);
      for (let i = 0; i < ICON_SVGS.length; i++) {
        const spriteMat = new THREE.SpriteMaterial({
          map: textures[i],
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.65,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(isMobile ? 0.28 : 0.38, isMobile ? 0.28 : 0.38, 1);
        universe.add(sprite);

        const glowMat = new THREE.MeshBasicMaterial({
          color: 0x586cf0,
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        universe.add(glow);

        nodes.push({
          sprite,
          glow,
          r: (isMobile ? 1.72 : 2.9) + (i % 2) * (isMobile ? 0.28 : 0.55),
          speed: 0.04 + (i % 2) * 0.025,
          tilt: i * 0.7,
          phase: i * (Math.PI * 2 / ICON_SVGS.length),
        });
      }

      // Linhas finas de conexão
      const linePositions = new Float32Array(nodes.length * 6);
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x7486ff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const lines = new THREE.LineSegments(lineGeo, lineMat);
      universe.add(lines);

      // Starfield mais denso e visível
      const STAR_N = 360;
      const starPos = new Float32Array(STAR_N * 3);
      const starPhase = new Float32Array(STAR_N);
      const starSpeed = new Float32Array(STAR_N);
      const starSize = new Float32Array(STAR_N);
      const starBrightness = new Float32Array(STAR_N);
      for (let i = 0; i < STAR_N; i++) {
        const r = 7 + Math.pow(Math.random(), 0.5) * 32;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi) - 5;
        starPhase[i] = Math.random() * Math.PI * 2;
        starSpeed[i] = 0.2 + Math.random() * 1.6;
        starSize[i] = 0.25 + Math.random() * 0.7;
        // 30% brilham mais, 70% ficam discretas
        starBrightness[i] = Math.random() < 0.3 ? 0.9 + Math.random() * 0.5 : 0.25 + Math.random() * 0.35;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      starGeo.setAttribute("phase", new THREE.BufferAttribute(starPhase, 1));
      starGeo.setAttribute("speed", new THREE.BufferAttribute(starSpeed, 1));
      starGeo.setAttribute("size", new THREE.BufferAttribute(starSize, 1));
      starGeo.setAttribute("brightness", new THREE.BufferAttribute(starBrightness, 1));

      const starMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x9aaae0) },
        },
        vertexShader: `
          attribute float phase;
          attribute float speed;
          attribute float size;
          attribute float brightness;
          varying float vAlpha;
          varying float vBrightness;
          uniform float uTime;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            float twinkle = 0.15 + 0.4 * sin(uTime * speed + phase);
            vAlpha = twinkle;
            vBrightness = brightness;
            gl_PointSize = size * (1.7 + 1.4 * twinkle) * (100.0 / -mvPosition.z);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vAlpha;
          varying float vBrightness;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float glow = 1.0 - smoothstep(0.0, 0.5, dist);
            gl_FragColor = vec4(uColor, vAlpha * glow * vBrightness * 0.6);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);

      // Interação: parallax + hover nos nós
      const mouse = { x: 0, y: 0, active: false };
      const targetRot = { x: 0, y: 0 };
      const curRot = { x: 0, y: 0 };
      const onPointerMove = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        mouse.active = true;
        targetRot.y = mouse.x * 0.35;
        targetRot.x = mouse.y * 0.22;
      };
      const onPointerLeave = () => {
        mouse.active = false;
        targetRot.x = 0;
        targetRot.y = 0;
      };
      if (!reduce) {
        mount.addEventListener("pointermove", onPointerMove, { passive: true });
        mount.addEventListener("pointerleave", onPointerLeave, { passive: true });
      }

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
        curRot.x += (targetRot.x - curRot.x) * 0.05;
        curRot.y += (targetRot.y - curRot.y) * 0.05;
        // Roda em torno do logo SM Hub — órbita 3D clara
        universe.rotation.x = curRot.x + 0.55 + Math.sin(t * 0.08) * 0.05;
        universe.rotation.y = curRot.y + t * 0.035;

        // Pulsar do anel central
        ringMat.opacity = 0.25 + Math.sin(t * 0.8) * 0.05;

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const a = n.phase + t * n.speed;
          const x = n.r * Math.cos(a);
          const y = Math.sin(n.tilt) * n.r * Math.sin(a);
          const z = Math.cos(n.tilt) * n.r * Math.sin(a);
          n.sprite.position.set(x, y, z);
          n.glow.position.set(x, y, z);

          // Hover nos nós: se mouse ativo, aumenta glow de quem está perto
          const worldPos = n.sprite.position.clone().applyMatrix4(universe.matrixWorld);
          const projected = worldPos.project(camera);
          const dx = projected.x - mouse.x;
          const dy = projected.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hover = mouse.active && dist < 0.18 ? 1 : 0;
          const targetOpacity = 0.14 + hover * 0.4;
          const glowMat = n.glow.material as ThreeTypes.MeshBasicMaterial;
          glowMat.opacity += (targetOpacity - glowMat.opacity) * 0.12;

          linePositions[i * 6] = 0;
          linePositions[i * 6 + 1] = 0;
          linePositions[i * 6 + 2] = 0;
          linePositions[i * 6 + 3] = x;
          linePositions[i * 6 + 4] = y;
          linePositions[i * 6 + 5] = z;
        }
        lineGeo.attributes.position.needsUpdate = true;

        stars.rotation.y = t * 0.01;
        starMat.uniforms.uTime.value = t;
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
        mount.removeEventListener("pointermove", onPointerMove);
        mount.removeEventListener("pointerleave", onPointerLeave);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
        io.disconnect();
        glowGeo.dispose();
        ringGeo.dispose();
        ringMat.dispose();
        nodes.forEach((n) => {
          const spriteMat = n.sprite.material as ThreeTypes.SpriteMaterial;
          spriteMat.map?.dispose();
          spriteMat.dispose();
          const glowMat = n.glow.material as ThreeTypes.MeshBasicMaterial;
          glowMat.dispose();
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
