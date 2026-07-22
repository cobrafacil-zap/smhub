"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * PageTransition — fade/slide suave do conteúdo ao navegar entre rotas.
 *
 * Em App Router sem framer-motion, a forma simples e confiável é keyar o
 * wrapper pelo `pathname`: quando muda, o React remonta o wrapper e a animação
 * CSS de entrada (`animate-slide-up`) roda. Custo: o conteúdo da rota anterior
 * é desmontado e o novo monta — esperado numa transição de página.
 *
 * Respeita prefers-reduced-motion (a utility é neutralizada globalmente; aqui
 * ainda keyamos para forçar a remontagem, mas sem movimento visível).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-slide-up">
      {children}
    </div>
  );
}