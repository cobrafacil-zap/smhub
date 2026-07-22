"use client";

import { useEffect, useRef } from "react";
import type * as ThreeTypes from "three";

/**
 * Hero3D — "universo" da SM Hub no hero da LP.
 *
 * Tendência 2026: profundidade 3D imersiva, mas com SENTIDO. Aqui vira um
 * cosmos da marca: um núcleo central (o Hub) com módulos orbitando em órbitas
 * inclinadas, linhas de conexão até o núcleo e um starfield de fundo. "SM Hub"
 * = centro de um universo de marketing conectado (clientes, redes, conteúdo,
 * financeiro, contratos girando em torno da agência).
 *
 * Tudo procedural (sem assets). Reage ao mouse (parallax/tilt do universo).
 *
 * Performance:
 *  - Carregado só na LP via import() no useEffect (three num chunk separado).
 *  - pixelRatio capado em 2, rAF único, pausa fora da viewport/aba oculta.
 *  - Respeita prefers-reduced-motion (frame estático, sem loop).
 *  - Cleanup total (dispose de geometrias/materiais/renderer).
 */
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
      const coreGeo = new THREE.IcosahedronGeometry(0.55, 1);
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

      // Halo do núcleo (wire sutil).
      const haloGeo = new THREE.IcosahedronGeometry(0.72, 0);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x8797ff,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      universe.add(halo);

      // Luz no núcleo (brilho central).
      const coreLight = new THREE.PointLight(0x3d5afe, 14, 30);
      coreLight.position.set(0, 0, 0);
      scene.add(coreLight);
      scene.add(new THREE.AmbientLight(0x0a1a40, 1.2));
      const rim = new THREE.PointLight(0x22d3ee, 8, 30);
      rim.position.set(4, 3, 3);
      scene.add(rim);

      // --- Nós orbitando (os módulos) ---
      type Node = {
        mesh: ThreeTypes.Mesh;
        r: number;
        speed: number;
        tilt: number;
        phase: number;
        mat: ThreeTypes.MeshStandardMaterial;
      };
      const ORBIT_COLORS = [0x8797ff, 0x22d3ee, 0x3d5afe, 0x8797ff, 0x22d3ee, 0x3d5afe];
      const nodes: Node[] = [];
      const nodeGeo = new THREE.SphereGeometry(0.09, 16, 16);
      for (let i = 0; i < ORBIT_COLORS.length; i++) {
        const mat = new THREE.MeshStandardMaterial({
          color: ORBIT_COLORS[i],
          emissive: ORBIT_COLORS[i],
          emissiveIntensity: 0.6,
          metalness: 0.3,
          roughness: 0.4,
        });
        const mesh = new THREE.Mesh(nodeGeo, mat);
        universe.add(mesh);
        nodes.push({
          mesh,
          r: 1.5 + (i % 3) * 0.45,
          speed: 0.18 + (i % 3) * 0.07,
          tilt: (i / ORBIT_COLORS.length) * Math.PI,
          phase: (i / ORBIT_COLORS.length) * Math.PI * 2,
          mat,
        });
      }

      // --- Linhas de conexão núcleo <-> nós (atualizadas por frame) ---
      const linePositions = new Float32Array(nodes.length * 6); // [center,node] p/ cada
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x8797ff,
        transparent: true,
        opacity: 0.22,
      });
      const lines = new THREE.LineSegments(lineGeo, lineMat);
      universe.add(lines);

      // --- Starfield (fundo cósmico) ---
      const STAR_N = 700;
      const starPos = new Float32Array(STAR_N * 3);
      for (let i = 0; i < STAR_N; i++) {
        const r = 6 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi) - 2; // empurra um pouco pra trás
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0x8797ff,
        size: 0.03,
        transparent: true,
        opacity: 0.65,
        sizeAttenuation: true,
      });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);

      // --- Interação: parallax/tilt do universo seguindo o mouse ---
      const target = { rx: 0, ry: 0 };
      const cur = { rx: 0, ry: 0 };
      const onPointer = (e: PointerEvent) => {
        target.ry = (e.clientX / window.innerWidth - 0.5) * 0.6;
        target.rx = (e.clientY / window.innerHeight - 0.5) * 0.4;
      };
      if (!reduce) window.addEventListener("pointermove", onPointer, { passive: true });

      // Pausa fora da viewport/aba oculta.
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

        // Atualiza órbitas + linhas.
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const a = n.phase + t * n.speed;
          const x = n.r * Math.cos(a);
          const y = Math.sin(n.tilt) * n.r * Math.sin(a);
          const z = Math.cos(n.tilt) * n.r * Math.sin(a);
          n.mesh.position.set(x, y, z);
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
        nodeGeo.dispose();
        nodes.forEach((n) => n.mat.dispose());
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