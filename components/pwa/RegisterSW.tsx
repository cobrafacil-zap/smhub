"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (`/sw.js`). Só em produção — em dev o SW
 * atrapalharia o HMR/cacheando rotas dinâmicas. Lida com atualizações:
 * quando um novo SW assume (controllerchange), recarrega uma vez.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("[sw] registro falhou:", err));
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  return null;
}