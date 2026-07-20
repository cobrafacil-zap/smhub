"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

/**
 * Error boundary da rota /super-admin/agencias. Captura qualquer erro de
 * render (server ou client) — inclusive o re-render disparado por
 * revalidatePath após uma action (ex.: forçar renovação manual) — e mostra
 * um fallback recuperável em vez do cru
 * "Application error: a server-side exception has occurred".
 */
export default function AgenciasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[super-admin/agencias] erro de render:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100">
          Não foi possível carregar as agências
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