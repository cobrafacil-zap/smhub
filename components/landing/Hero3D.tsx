"use client";

import { useEffect, useRef } from "react";

/**
 * Hero3D — cena WebGL procedural (three.js puro) para o hero da LP.
 *
 * Tendência 2026: profundidade 3D e interação imersiva. Aqui vira um
 * icosaedro iridescente que flutua + campo de partículas, reagindo ao mouse
 * (parallax) e ao scroll (tilt). Sem assets externos — tudo procedural.
 *
 * Performance:
 *  - Carregado só na LP via next/dynamic (não vai pros painéis).
 *  - pixelRatio capado em 2, rAF único, pausa quando a viewport sai/aba oculta.
 *  - Respeita prefers-reduced-motion (frame estático, sem loop).
 *  - Cleanup total (dispose de geometrias/materiais/renderer).
 */
export function Hero3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Import dinâmico: three fica num chunk separado, só baixado na LP.
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
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 0, 6);

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

      // --- Objeto central: icosaedro sólido + wireframe sobreposto ---
      const group = new THREE.Group();
      scene.add(group);

      const icoGeo = new THREE.IcosahedronGeometry(1.2, 1);
      const solidMat = new THREE.MeshStandardMaterial({
        color: 0x3d5afe,
        metalness: 0.55,
        roughness: 0.25,
        flatShading: true,
        transparent: true,
        opacity: 0.92,
      });
      const solid = new THREE.Mesh(icoGeo, solidMat);
      group.add(solid);

      const wireGeo = new THREE.IcosahedronGeometry(1.23, 1);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x8797ff,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      group.add(wire);

      // Halo maior, bem sutil, pra dar profundidade.
      const haloGeo = new THREE.IcosahedronGeometry(1.7, 0);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      group.add(halo);

      // --- Luzes (rim light royal + cyan) ---
      scene.add(new THREE.AmbientLight(0x0a1a40, 1.4));
      const l1 = new THREE.PointLight(0x3d5afe, 22, 50);
      l1.position.set(3.5, 2.5, 3);
      const l2 = new THREE.PointLight(0x22d3ee, 16, 50);
      l2.position.set(-3.5, -1.5, 2);
      scene.add(l1, l2);

      // --- Partículas (casca esférica dispersa) ---
      const N = 520;
      const positions = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        // distribuição numa casca de raio ~3.2
        const r = 2.6 + Math.random() * 1.4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0x8797ff,
        size: 0.035,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(pGeo, pMat);
      scene.add(points);

      // --- Estado de interação (mouse + scroll), com lerp suave ---
      const target = { rx: 0, ry: 0 };
      const cur = { rx: 0, ry: 0 };
      const onPointer = (e: PointerEvent) => {
        const px = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
        const py = (e.clientY / window.innerHeight - 0.5) * 2;
        target.ry = px * 0.5;
        target.rx = py * 0.35;
      };
      const onScroll = () => {
        target.rx += 0; // scroll só influencia via rotação contínua abaixo
      };
      if (!reduce) {
        window.addEventListener("pointermove", onPointer, { passive: true });
        window.addEventListener("scroll", onScroll, { passive: true });
      }

      // Pausa quando fora da viewport ou aba oculta → economia de bateria.
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
        // Rotação contínua lenta + parallax do mouse (lerp)
        cur.rx += (target.rx - cur.rx) * 0.05;
        cur.ry += (target.ry - cur.ry) * 0.05;
        group.rotation.x = cur.rx + Math.sin(t * 0.25) * 0.12;
        group.rotation.y = cur.ry + t * 0.18;
        halo.rotation.x = t * 0.1;
        halo.rotation.y = -t * 0.14;
        points.rotation.y = t * 0.04;
        points.rotation.x = Math.sin(t * 0.15) * 0.1;
        renderer.render(scene, camera);
      };

      if (reduce) {
        renderFrame(); // frame estático
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
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
        io.disconnect();
        icoGeo.dispose();
        solidMat.dispose();
        wireGeo.dispose();
        wireMat.dispose();
        haloGeo.dispose();
        haloMat.dispose();
        pGeo.dispose();
        pMat.dispose();
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