"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BriefingForm } from "@/app/admin/clientes/[id]/BriefingForm";
import type { Cliente } from "@/types/database";

/**
 * Botão "Novo briefing" do /admin/briefings: abre um modal com seletor de
 * cliente + o formulário de briefing. O briefing criado é marcado como
 * interno (cliente não vê).
 */
export function NovoBriefingButton({
  clientes,
}: {
  clientes: Pick<Cliente, "id" | "nome_empresa">[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (clientes.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        iconLeft={<Plus className="h-4 w-4" />}
      >
        Novo briefing
      </Button>

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
              <h3 className="text-base font-semibold text-slate-100">Novo briefing</h3>
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
              clientes={clientes}
              defaultOpen
              onCreated={() => {
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