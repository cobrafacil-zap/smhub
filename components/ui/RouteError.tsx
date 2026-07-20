"use client";

import { useEffect } from "react";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

/**
 * Error boundary reutilizável pros error.tsx das rotas. Cada error.tsx
 * passa um `titulo` (o que não carregou) e o `escopo` (p/ o log). Evita
 * duplicar ~45 arquivos iguais. Mostra fallback recuperável em vez do
 * "Application error: a server-side exception has occurred" do Next.
 */
export function RouteError({
  error,
  reset,
  titulo,
  escopo,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  titulo: string;
  escopo: string;
}) {
  useEffect(() => {
    console.error(`[${escopo}] erro de render:`, error);
  }, [error, escopo]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100">
          Não foi possível carregar {titulo}
        </h2>
        <p className="text-sm text-slate-400">
          Ocorreu um erro ao montar esta página. Você pode tentar novamente.
        </p>
        {error?.digest && (
          <p className="text-[11px] text-slate-600 font-mono">
            digest: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button onClick={reset} variant="secondary">
            Tentar novamente
          </Button>
        </div>
      </div>
    </div>
  );
}