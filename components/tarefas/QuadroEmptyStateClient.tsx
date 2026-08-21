"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { criarQuadroComColunasAction } from "@/lib/actions/coluna-actions";

/**
 * Empty state da página /admin/tarefas quando a agência ainda não tem
 * nenhum quadro. Mostra botões pra criar o quadro "desta semana" ou
 * "da próxima semana" (UX confirmada: nada acontece sozinho).
 */
export function QuadroEmptyStateClient({
  labelSemanaAtual,
  labelProximaSemana,
}: {
  labelSemanaAtual: string;
  labelProximaSemana: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function criarQuadro(nome: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("nome", nome);
      const res = await criarQuadroComColunasAction(fd);
      if (res?.error) {
        alert(res.error);
        return;
      }
      if (res?.id) {
        router.push(`/admin/tarefas?quadro=${res.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <EmptyState
      icon={<Plus className="h-10 w-10" />}
      title="Nenhum quadro ainda"
      description="Crie um quadro para esta semana ou para a próxima. Depois é só adicionar as colunas que fizerem sentido — sem modelo pronto."
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            loading={pending}
            onClick={() => criarQuadro(`Semana ${labelSemanaAtual}`)}
            iconLeft={<CalendarDays className="h-4 w-4" />}
          >
            Criar desta semana
            <span className="ml-1 text-royal-200/80 font-normal normal-case">
              ({labelSemanaAtual})
            </span>
          </Button>
          <Button
            variant="secondary"
            loading={pending}
            onClick={() => criarQuadro(`Semana ${labelProximaSemana}`)}
            iconLeft={<ChevronRight className="h-4 w-4" />}
          >
            Criar da próxima
            <span className="ml-1 text-slate-400 font-normal normal-case">
              ({labelProximaSemana})
            </span>
          </Button>
        </div>
      }
    />
  );
}
