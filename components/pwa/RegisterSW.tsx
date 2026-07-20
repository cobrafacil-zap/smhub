"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (`/sw.js`). Só em produção — em dev o SW
 * atrapalharia o HMR/cacheando rotas dinâmicas.
 *
 * NÃO recarregamos a página em controllerchange. Antes isso forçava um reload
 * no primeiro acesso após cada deploy (SW novo assumia → controllerchange →
 * window.location.reload), o que dava a sensação de "a página carregou e
 * abriu de novo". Como o SW só cacheia assets estáticos com hash no nome
 * (URLs novas a cada deploy), não precisa recarregar — os chunks novos são
 * buscados frescos automaticamente.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("[sw] registro falhou:", err));
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}