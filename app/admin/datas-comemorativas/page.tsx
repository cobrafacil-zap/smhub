import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarDays, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DataComemorativaForm } from "@/components/forms/DataComemorativaForm";
import { criarDataComemorativaAction, deletarDataComemorativaAction } from "@/lib/actions/agencia-actions";
import { BaixarModeloCsvButton } from "./BaixarModeloCsvButton";
import { ImportarDatasForm } from "./ImportarDatasForm";
import type { DataComemorativa } from "@/types/database";

export const metadata = { title: "Datas comemorativas" };

export default async function DatasComemorativasPage() {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;
  // Mostra globals (agencia_id null) + as da agência. Antes filtrava só por
  // agencia_id, mas a coluna não existia → lista sempre vazia.
  const { data: datas } = await supabase
    .from("datas_comemorativas")
    .select("*")
    .or(`agencia_id.is.null,agencia_id.eq.${aid}`)
    .order("data");
  const list = (datas as DataComemorativa[] | null) ?? [];

  async function criar(formData: FormData) {
    "use server";
    await criarDataComemorativaAction(formData);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datas comemorativas"
        description="Cadastre datas relevantes para seus clientes."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Datas comemorativas" }]}
      />

      {/* Importar via planilha + modelo pra baixar */}
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Importar várias datas</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Baixe o modelo, preencha com <code className="text-slate-400">data;nome;segmento</code> e
              suba o CSV. As datas ficam vinculadas à sua agência.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <BaixarModeloCsvButton />
            <ImportarDatasForm />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
            <Plus className="h-4 w-4 text-royal-300" /> Nova data
          </h3>
          <DataComemorativaForm action={criar} />
        </Card>

        <Card className="lg:col-span-2 !p-0">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-slate-300">Cadastradas ({list.length})</h3>
          </div>
          {list.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              title="Sem datas"
              description="Adicione uma data manualmente ou importe via CSV."
            />
          ) : (
            <ul className="divide-y divide-border">
              {list.map((d) => {
                const global = d.agencia_id == null;
                return (
                  <li key={d.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-100">{d.nome}</p>
                        {global && (
                          <Badge variant="default" className="!text-[10px] !px-1.5 !py-0">
                            Global
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDate(d.data)}
                        {d.segmento && d.segmento.length > 0 && ` • ${d.segmento.join(", ")}`}
                      </p>
                    </div>
                    {!global && (
                      <div className="flex items-center gap-2 shrink-0">
                        <form action={deletarDataComemorativaAction.bind(null, d.id)}>
                          <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                            Excluir
                          </button>
                        </form>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}