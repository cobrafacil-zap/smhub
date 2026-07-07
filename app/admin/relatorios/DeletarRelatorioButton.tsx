"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletarRelatorioAction } from "@/lib/actions/agencia-actions";
import { toast } from "sonner";

export function DeletarRelatorioButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function excluir() {
    if (!window.confirm("Excluir este relatório? Esta ação não pode ser desfeita.")) return;
    start(async () => {
      const res = await deletarRelatorioAction(id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Relatório excluído.");
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={excluir}
      disabled={pending}
      className="text-rose-400 hover:text-rose-300 disabled:opacity-50"
      title="Excluir relatório"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}