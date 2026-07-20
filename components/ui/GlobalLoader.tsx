"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Loading global — aparece em TODA tela sempre que a app está "congelada"
 * fazendo algo (navegação, server action, upload, chamadas /api). Montado no
 * root layout, atende todos os usuários.
 *
 * Dois indicadores:
 *  1. Barra de progresso no topo — instantânea (feedback imediato).
 *  2. Overlay "Carregando…" com fundo borrado — só se a ação demorar mais
 *     que OVERLAY_DELAY (~450ms), pra não borrá a tela em ações rápidas.
 *     Bloca cliques (evita duplo-envio).
 *
 * Gatilhos (alimentam o mesmo contador de UI):
 *  A) NAVEGAÇÃO — dispara o INSTANTE em que o usuário clica num link interno
 *     (listener de clique em <a> mesmo-origem). Isto é o que faz a barra
 *     aparecer ao trocar de página (Clientes, Contratos, Financeiro...).
 *     O App Router não expõe evento de "início de navegação" e só atualiza
 *     a URL ao CONCLUIR — por isso dependemos do clique, não de
 *     history.pushState (que dispararia tarde demais).
 *     Fallbacks: history.pushState/replaceState/popstate cobrem
 *     navegações programáticas (router.push).
 *     Completa quando usePathname muda (a nova rota renderizou).
 *  B) REQUISIÇÕES — intercepta window.fetch e conta requisições same-origin
 *     não-prefetch (server actions, uploads, /api).
 */
const OVERLAY_DELAY = 1500; // ms — overlay borrado só em ações bem demoradas;
// a barra de progresso no topo é instantânea e dá feedback leve sem
// borrar a tela em navegações rápidas (agora com skeletons por rota).
const NAV_FALLBACK_MS = 10000; // ms — segurança se a rota não mudar

export function GlobalLoader() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [barVisible, setBarVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const count = useRef(0); // ações em andamento (navegação + fetch)
  const navActive = useRef(false);
  const pct = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideBar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayDelay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navFallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTicking = useCallback(() => {
    if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }
  }, []);

  const startTicking = useCallback(() => {
    if (tick.current) return;
    tick.current = setInterval(() => {
      pct.current += (90 - pct.current) * 0.12;
      if (pct.current > 89.6) pct.current = 90;
      setProgress(pct.current);
    }, 130);
  }, []);

  const start = useCallback(() => {
    if (hideBar.current) {
      clearTimeout(hideBar.current);
      hideBar.current = null;
    }
    count.current += 1;
    if (count.current === 1) {
      pct.current = 0;
      setProgress(12);
      setBarVisible(true);
      startTicking();
      if (overlayDelay.current) clearTimeout(overlayDelay.current);
      overlayDelay.current = setTimeout(() => {
        if (count.current > 0) setOverlayVisible(true);
      }, OVERLAY_DELAY);
    }
  }, [startTicking]);

  const done = useCallback(() => {
    count.current = Math.max(0, count.current - 1);
    if (count.current === 0) {
      stopTicking();
      if (overlayDelay.current) {
        clearTimeout(overlayDelay.current);
        overlayDelay.current = null;
      }
      setOverlayVisible(false);
      pct.current = 100;
      setProgress(100);
      hideBar.current = setTimeout(() => {
        setBarVisible(false);
        pct.current = 0;
        setProgress(0);
      }, 220);
    }
  }, [stopTicking]);

  // Inicia uma navegação (idempotente: 1 navegação = 1 start).
  const beginNavigation = useCallback(() => {
    if (navActive.current) return;
    navActive.current = true;
    start();
    if (navFallback.current) clearTimeout(navFallback.current);
    navFallback.current = setTimeout(() => {
      if (navActive.current) {
        navActive.current = false;
        done();
      }
    }, NAV_FALLBACK_MS);
  }, [start, done]);

  // Conclui a navegação quando a rota muda de fato.
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (navActive.current && pathname !== prevPath.current) {
      navActive.current = false;
      if (navFallback.current) {
        clearTimeout(navFallback.current);
        navFallback.current = null;
      }
      done();
    }
    prevPath.current = pathname;
  }, [pathname, done]);

  // Gatilho A (principal): clique em link interno — feedback IMEDIATO.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      // ignora cliques que abrem em nova aba/janela
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // só links internos (mesma origem, não vazios, não #anchors)
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target && anchor.target !== "_self") return; // _blank etc
      if (anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return; // mesma página — não é navegação
      }
      beginNavigation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [beginNavigation]);

  // Gatilho A (fallback): navegação programática (router.push/back/forward).
  useEffect(() => {
    const push = history.pushState;
    const replace = history.replaceState;
    history.pushState = function (...args: Parameters<typeof push>) {
      beginNavigation();
      return push.apply(this, args);
    };
    history.replaceState = function (...args: Parameters<typeof replace>) {
      beginNavigation();
      return replace.apply(this, args);
    };
    window.addEventListener("popstate", beginNavigation);
    return () => {
      history.pushState = push;
      history.replaceState = replace;
      window.removeEventListener("popstate", beginNavigation);
      if (navFallback.current) clearTimeout(navFallback.current);
    };
  }, [beginNavigation]);

  // Gatilho B: server actions / uploads / chamadas /api.
  useEffect(() => {
    const origFetch = window.fetch.bind(window);
    const isPrefetch = (init?: RequestInit) => {
      const h = new Headers(init?.headers);
      return !!h.get("Next-Router-Prefetch") || h.get("purpose") === "prefetch";
    };
    const sameOrigin = (url: string) => {
      try {
        const u = new URL(url, window.location.href);
        return u.origin === window.location.origin;
      } catch {
        return false;
      }
    };
    const tracked = (input: RequestInfo | URL, init?: RequestInit): boolean => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
          ? input.url
          : String(input);
      return sameOrigin(url) && !isPrefetch(init);
    };
    window.fetch = async (input, init) => {
      const shouldTrack = tracked(input as RequestInfo | URL, init);
      if (shouldTrack) start();
      try {
        return await origFetch(input as Parameters<typeof origFetch>[0], init);
      } finally {
        if (shouldTrack) done();
      }
    };
    return () => {
      window.fetch = origFetch;
    };
  }, [start, done]);

  return (
    <>
      {/* Barra de progresso no topo — instantânea */}
      {barVisible && (
        <div
          aria-hidden
          className="fixed top-0 left-0 right-0 z-[10000] h-1 pointer-events-none"
        >
          <div
            className="h-full bg-gradient-to-r from-royal-400 via-royal-500 to-royal-300 shadow-[0_0_8px_rgba(61,90,254,0.6)] transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Overlay "Carregando…" com fundo borrado — só em ações demoradas */}
      {overlayVisible && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Carregando"
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-bg/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-bg-surface/95 px-6 py-5 shadow-elevated">
            <div className="h-8 w-8 rounded-full border-2 border-royal-500/30 border-t-royal-400 animate-spin" />
            <p className="text-sm font-medium text-slate-200">Carregando…</p>
          </div>
        </div>
      )}
    </>
  );
}