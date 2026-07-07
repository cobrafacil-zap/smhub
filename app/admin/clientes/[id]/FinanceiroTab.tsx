import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Wallet, CheckCircle2, Zap, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FATURA_STATUS } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import { MiniStat } from "@/components/admin/MiniStat";
import { FaturaForm } from "./FaturaForm";
import { FaturaActions } from "./FaturaActions";
import { FaturaArquivosCell } from "./FaturaArquivosCell";
import { GerarMensalidadeForm } from "./GerarMensalidadeForm";
import type { Cliente, Fatura, FaturaArquivo } from "@/types/database";

export async function FinanceiroTab({ cliente }: { cliente: Cliente }) {
  const supabase = createClient();
  const [{ data: faturas }, { data: arquivos }] = await Promise.all([
    supabase
      .from("faturas")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("data_vencimento", { ascending: false }),
    supabase
      .from("fatura_arquivos")
      .select("*")
      .eq("agencia_id", cliente.agencia_id),
  ]);
  const list = (faturas as Fatura[] | null) ?? [];
  const arqsPorFatura = new Map<string, FaturaArquivo[]>();
  for (const a of (arquivos as FaturaArquivo[] | null) ?? []) {
    const arr = arqsPorFatura.get(a.fatura_id) ?? [];
    arr.push(a);
    arqsPorFatura.set(a.fatura_id, arr);
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const pendentes = list.filter((f) => f.status === "pendente");
  const pagas = list.filter((f) => f.status === "pago");
  const vencidas = list.filter((f) => f.status !== "pago" && f.data_vencimento < hoje);

  const totalPendente = pendentes.reduce((s, f) => s + Number(f.valor), 0);
  const totalPago = pagas.reduce((s, f) => s + Number(f.valor), 0);
  const totalVencido = vencidas.reduce((s, f) => s + Number(f.valor), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MiniStat
          label="Pendente"
          value={formatBRL(totalPendente)}
          icon={<Wallet className="h-4 w-4" />}
          tone={totalPendente > 0 ? "warn" : "default"}
          hint={`${pendentes.length} fatura(s)`}
        />
        <MiniStat
          label="Pago"
          value={formatBRL(totalPago)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
          hint={`${pagas.length} fatura(s)`}
        />
        <MiniStat
          label="Vencido"
          value={formatBRL(totalVencido)}
          icon={<Zap className="h-4 w-4" />}
          tone={totalVencido > 0 ? "danger" : "default"}
          hint={totalVencido > 0 ? `${vencidas.length} fatura(s)` : "Em dia"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FaturaForm clienteId={cliente.id} />
        <GerarMensalidadeForm clienteId={cliente.id} />
      </div>

      <Card className="!p-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Faturas do cliente</h3>
          <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            Clique em "Anexar" para enviar boleto / NF
          </p>
        </div>
        {list.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-8 w-8" />}
            title="Nenhuma fatura emitida"
            description="Use os formulários acima para criar uma fatura avulsa ou gerar a mensalidade do mês."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-border">
                  <th className="px-4 py-2 font-medium">Número</th>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2 font-medium">Valor</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Boleto / NF</th>
                  <th className="px-4 py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((f) => {
                  const st = FATURA_STATUS[f.status];
                  const arqs = arqsPorFatura.get(f.id) ?? [];
                  return (
                    <tr key={f.id} className="border-b border-border/50">
                      <td className="px-4 py-2 text-slate-200 font-mono text-xs">
                        {f.numero ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-300">{formatDate(f.data_vencimento)}</td>
                      <td className="px-4 py-2 text-slate-100 font-semibold">{formatBRL(f.valor)}</td>
                      <td className="px-4 py-2">
                        <Badge variant={st.color}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <FaturaArquivosCell faturaId={f.id} arquivos={arqs} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <FaturaActions
                          id={f.id}
                          status={f.status}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
