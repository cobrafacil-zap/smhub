"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { BriefingForm } from "./BriefingForm";

/**
 * Botão "Editar" de um briefing: abre um modal com o BriefingForm em modo
 * edição (pré-preenchido com o título e os pares atuais). Após salvar, fecha
 * o modal e revalida a rota atual via router.refresh().
 */
export function EditarBriefingButton({
  briefingId,
  tituloInicial,
  paresIniciais,
}: {
  briefingId: string;
  tituloInicial: string;
  paresIniciais: { pergunta: string; resposta: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1.5 rounded text-slate-400 hover:text-royal-300 hover:bg-royal-500/10 transition"
        title="Editar briefing"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-bg-surface pb-3 border-b border-border -mx-5 px-5 -mt-5 pt-5 z-10">
              <h3 className="text-base font-semibold text-slate-100">Editar briefing</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-bg-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <BriefingForm
              clienteId=""
              briefingId={briefingId}
              tituloInicial={tituloInicial}
              paresIniciais={paresIniciais}
              onSaved={() => {
                setOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}