"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarFaturaStatusAction } from "@/lib/actions/fatura-briefing-actions";
import { toast } from "sonner";

/**
 * Botão "Marcar paga" com feedback. Usa useTransition + toast pra mostrar
 * sucesso/erro (antes o form postava numa action inline que ignorava o
 * retorno, então um erro — ex.: coluna data_pagamento inexistente — ficava
 * silencioso e a fatura nunca era efetivada como paga).
 */
export function MarcarFaturaPagaButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function marcar() {
    start(async () => {
      const res = await atualizarFaturaStatusAction(id, "pago");
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Fatura marcada como paga.");
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={marcar}
      disabled={pending}
      className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
    >
      {pending ? "Salvando…" : "Marcar paga"}
    </button>
  );
}