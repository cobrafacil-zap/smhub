import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { CONTRATO_STATUS } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import { Plus, FileText, ExternalLink, PenLine, AlertCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { ContratoActions } from "./ContratoActions";
import type { AssinaturaRegistro, Cliente, Contrato } from "@/types/database";

// Dias até o fim da vigência. Negativo = vencido.
function diasParaVencer(dataFim?: string | null): number | null {
  if (!dataFim) return null;
  const dt = new Date(dataFim).getTime();
  if (Number.isNaN(dt)) return null;
  return Math.ceil((dt - Date.now()) / (24 * 60 * 60 * 1000));
}

export async function ContratosTab({ cliente }: { cliente: Cliente }) {
  const supabase = createClient();
  const { data: contratos } = await supabase
    .from("contratos")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: false });
  const list = (contratos as Contrato[] | null) ?? [];

  const ativos = list.filter((c) => c.status === "ativo" || c.status === "assinado").length;
  const total = list.length;

  // Contratos pendentes de assinatura (rascunho ou enviado, sem assinaturas)
  const pendentesAssinatura = list.filter((c) => {
    const ass: AssinaturaRegistro[] = Array.isArray(c.assinaturas)
      ? (c.assinaturas as unknown as AssinaturaRegistro[])
      : [];
    return (c.status === "rascunho" || c.status === "enviado") && ass.length === 0;
  });

  // Contratos ativos/assinados próximos do vencimento (≤30 dias) ou já vencidos.
  const aVencer = list.filter((c) => {
    if (c.status !== "ativo" && c.status !== "assinado") return false;
    const d = diasParaVencer(c.data_fim);
    return d !== null && d <= 30;
  });

  return (
    <div className="space-y-4">
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">Contratos do cliente</p>
          <p className="text-xs text-slate-500">
            {ativos} ativo(s) de {total} no total.
          </p>
        </div>
        <Link href={`/admin/contratos/gerador?cliente=${cliente.id}`}>
          <span className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Gerar novo contrato
          </span>
        </Link>
      </Card>

      {/* Banner de contratos aguardando assinatura */}
      {pendentesAssinatura.length > 0 && (
        <Card className="!border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">
                {pendentesAssinatura.length === 1
                  ? "1 contrato aguardando assinatura"
                  : `${pendentesAssinatura.length} contratos aguardando assinatura`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Nenhuma assinatura registrada ainda. Gere o link de assinatura para enviar ao cliente.
              </p>
              <ul className="mt-3 space-y-2">
                {pendentesAssinatura.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-bg-elevated/40 border border-border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-100 truncate">{c.titulo}</p>
                      <p className="text-[11px] text-slate-500">
                        {c.data_inicio && c.data_fim
                          ? `${formatDate(c.data_inicio)} → ${formatDate(c.data_fim)}`
                          : "Sem vigência definida"}
                        {c.valor_mensal ? ` • ${formatBRL(c.valor_mensal)} / mês` : ""}
                      </p>
                    </div>
                    <Link
                      href={`/admin/contratos/${c.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-amber-200 hover:text-amber-100 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-md px-2.5 py-1.5"
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      Registrar assinatura
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Banner de contratos a vencer / vencidos */}
      {aVencer.length > 0 && (
        <Card className="!border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">
                {aVencer.length === 1
                  ? "1 contrato próximo do vencimento"
                  : `${aVencer.length} contratos próximos do vencimento`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Renove ou renegocie antes do fim da vigência para evitar interrupção.
              </p>
              <ul className="mt-3 space-y-2">
                {aVencer.map((c) => {
                  const d = diasParaVencer(c.data_fim)!;
                  return (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-md bg-bg-elevated/40 border border-border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-100 truncate">{c.titulo}</p>
                        <p className="text-[11px] text-slate-500">
                          {c.data_fim ? `Vence em ${formatDate(c.data_fim)}` : "Sem vigência"}
                        </p>
                      </div>
                      <Badge variant={d < 0 ? "danger" : "warning"}>
                        {d < 0
                          ? `Vencido há ${Math.abs(d)} dia(s)`
                          : `Vence em ${d} dia(s)`}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="Nenhum contrato"
            description="Gere um contrato a partir de um template para este cliente."
            action={
              <Link href={`/admin/contratos/gerador?cliente=${cliente.id}`}>
                <span className="btn btn-primary inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Gerar contrato
                </span>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((c) => {
            const st = CONTRATO_STATUS[c.status];
            return (
              <Card key={c.id} className="hover:border-royal-500/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/contratos/${c.id}`}
                      className="font-medium text-slate-100 hover:text-royal-300 inline-flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4 text-royal-300" />
                      {c.titulo}
                      <ExternalLink className="h-3 w-3 text-slate-500" />
                    </Link>
                    <p className="text-xs text-slate-500 mt-1">
                      {c.data_inicio && c.data_fim && (
                        <>
                          {formatDate(c.data_inicio)} → {formatDate(c.data_fim)}
                        </>
                      )}
                      {c.valor_mensal && (
                        <> • <span className="text-slate-300">{formatBRL(c.valor_mensal)} / mês</span></>
                      )}
                      {c.duracao_meses && <> • {c.duracao_meses} meses</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                      const d = diasParaVencer(c.data_fim);
                      if (
                        (c.status === "ativo" || c.status === "assinado") &&
                        d !== null &&
                        d <= 30
                      ) {
                        return (
                          <Badge variant={d < 0 ? "danger" : "warning"} className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {d < 0 ? `Vencido há ${Math.abs(d)}d` : `Vence em ${d}d`}
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                    <Badge variant={st.color}>{st.label}</Badge>
                    <ContratoActions id={c.id} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
