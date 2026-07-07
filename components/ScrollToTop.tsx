"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Rola a página pro topo a cada mudança de rota. O App Router às vezes não
 * reseta o scroll (especialmente em layouts com sidebar/coluna flex), então
 * garantimos aqui de forma explícita e global — vale pra admin, cliente,
 * super-admin e LP.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // "instant" pra não dar animação estranha na navegação.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}