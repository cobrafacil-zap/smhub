import { createAdminClient } from "@/lib/supabase/admin";
import { GravacoesCalendarClient, type GravacaoItem } from "@/components/gravacoes/GravacoesCalendarClient";
import { Card } from "@/components/ui/Card";
import { Video } from "lucide-react";
import type { Cliente, Gravacao } from "@/types/database";

export async function GravacoesTab({
  cliente,
  searchParams,
}: {
  cliente: Cliente;
  searchParams: { mes?: string };
}) {
  const supabase = createAdminClient();
  const hoje = new Date();
  const [yy, mm] =
    searchParams.mes?.split("-").map(Number) ?? [hoje.getFullYear(), hoje.getMonth() + 1];
  const mesAtivo = `${yy}-${String(mm).padStart(2, "0")}`;
  const ultimoDia = new Date(yy, mm, 0).getDate();
  const inicioMes = `${mesAtivo}-01`;
  const fimMes = `${mesAtivo}-${String(ultimoDia).padStart(2, "0")}`;

  const { data } = await supabase
    .from("gravacoes")
    .select("*")
    .eq("cliente_id", cliente.id)
    .eq("agencia_id", cliente.agencia_id!)
    .gte("data", inicioMes)
    .lte("data", fimMes)
    .order("data");

  const gravacoes: GravacaoItem[] = (data as Gravacao[] | null) ?? [];

  return (
    <div className="space-y-4">
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-royal-500/20 flex items-center justify-center">
            <Video className="h-5 w-5 text-royal-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Gravações</p>
            <p className="text-xs text-slate-500">
              Agende e acompanhe as gravações deste cliente.
            </p>
          </div>
        </div>
      </Card>

      <GravacoesCalendarClient
        gravacoes={gravacoes}
        clientes={[{ id: cliente.id, nome_empresa: cliente.nome_empresa }]}
        mesAtivo={mesAtivo}
        basePath={`/admin/clientes/${cliente.id}`}
        modoCliente={false}
        clienteFixoId={cliente.id}
        extraParams={{ tab: "gravacoes" }}
      />
    </div>
  );
}