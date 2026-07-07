"use client";

/**
 * Botão client-only para disparar window.print().
 * Vive em arquivo separado porque precisa do "use client".
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="ml-3 bg-white text-royal-700 font-medium px-3 py-1 rounded hover:bg-slate-100"
    >
      Imprimir agora
    </button>
  );
}
