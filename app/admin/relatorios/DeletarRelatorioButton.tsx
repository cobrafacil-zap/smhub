"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletarRelatorioAction } from "@/lib/actions/agencia-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";

export function DeletarRelatorioButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      title="Excluir relatório?"
      description="Esta ação não pode ser desfeita."
      confirmText="Excluir"
      variant="danger"
      trigger={
        <button
          type="button"
          className="text-rose-400 hover:text-rose-300"
          title="Excluir relatório"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      }
      onConfirm={async () => {
        const res = await deletarRelatorioAction(id);
        if (res?.error) {
          toast.error(res.error);
          throw new Error(res.error);
        }
        toast.success("Relatório excluído.");
        router.refresh();
      }}
    />
  );
}