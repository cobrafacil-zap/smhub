import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardEmpty } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContractPDFButton } from "@/components/contracts/ContractPDFButton";
import { GerarLinkAssinaturaButton } from "@/components/contracts/GerarLinkAssinaturaButton";
import { TemplatePreview } from "@/components/contracts/TemplatePreview";
import { CONTRATO_STATUS, CONTRATO_STATUS as STATUS_MAP } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import { renovarContratoAction, deletarContratoAction, cancelarContratoAction } from "@/lib/actions/contrato-actions";
import { ArrowLeft, RefreshCw, X, Trash2, Clock, AlertTriangle } from "lucide-react";
import type { AssinaturaRegistro, Cliente, Contrato } from "@/types/database";

export default async function ContratoDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { data: contrato, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", params.id)
    .eq("agencia_id", session.profile.agencia_id!)
    .single();
  if (error || !contrato) notFound();

  const c = contrato as Contrato;
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome_empresa, nome_responsavel, email")
    .eq("id", c.cliente_id)
    .single();

  const st = CONTRATO_STATUS[c.status];
  const assinaturas: AssinaturaRegistro[] = Array.isArray(c.assinaturas)
    ? (c.assinaturas as unknown as AssinaturaRegistro[])
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.titulo}
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/contratos", label: "Contratos" },
          { label: c.titulo },
        ]}
        actions={
          <>
            <Link href="/admin/contratos">
              <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />}>Voltar</Button>
            </Link>
            <ContractPDFButton contratoId={c.id} />
            {(c.status === "rascunho" || c.status === "enviado") && (
              <GerarLinkAssinaturaButton contratoId={c.id} />
            )}
            {(c.status === "assinado" || c.status === "ativo" || c.status === "encerrado") && (
              <form action={async () => { "use server"; await renovarContratoAction(c.id); }}>
                <Button type="submit" variant="secondary" iconLeft={<RefreshCw className="h-4 w-4" />}>
                  Renovar
                </Button>
              </form>
            )}
            {c.status !== "cancelado" && c.status !== "encerrado" && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" iconLeft={<X className="h-4 w-4" />}>
                    Cancelar
                  </Button>
                }
                title="Cancelar contrato?"
                description="Esta ação não pode ser desfeita. O contrato será marcado como cancelado."
                confirmText="Cancelar contrato"
                variant="danger"
                onConfirm={async () => {
                  "use server";
                  await cancelarContratoAction(c.id);
                }}
              />
            )}
            <ConfirmDialog
              trigger={
                <Button variant="ghost" iconLeft={<Trash2 className="h-4 w-4" />}>
                  Excluir
                </Button>
              }
              title="Excluir contrato?"
              description="Esta ação não pode ser desfeita."
              confirmText="Excluir"
              variant="danger"
              onConfirm={async () => {
                "use server";
                await deletarContratoAction(c.id);
                // redirect handled by Next
              }}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Status</h3>
          <Badge variant={st.color} className="text-sm">{st.label}</Badge>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Valor mensal</h3>
          <p className="text-2xl font-bold kpi-num text-slate-100">
            {c.valor_mensal ? formatBRL(c.valor_mensal) : "—"}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Vigência</h3>
          <p className="text-sm text-slate-200">
            {c.data_inicio ? formatDate(c.data_inicio) : "—"} até{" "}
            {c.data_fim ? formatDate(c.data_fim) : "—"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {c.duracao_meses ?? "—"} meses
          </p>
          {(() => {
            if (!c.data_fim) return null;
            const dt = new Date(c.data_fim).getTime();
            if (Number.isNaN(dt)) return null;
            const dias = Math.ceil((dt - Date.now()) / (24 * 60 * 60 * 1000));
            if (dias > 30) return null;
            const vencido = dias < 0;
            return (
              <div
                className={`mt-3 inline-flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 ${
                  vencido
                    ? "bg-danger-500/10 text-danger-300 border border-danger-500/30"
                    : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                }`}
              >
                {vencido ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                {vencido
                  ? `Vencido há ${Math.abs(dias)} dia(s)`
                  : `Vence em ${dias} dia(s)`}
              </div>
            );
          })()}
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Cliente</h3>
        {(cliente as Cliente | null) ? (
          <div>
            <p className="font-medium text-slate-100">{(cliente as Cliente).nome_empresa}</p>
            <p className="text-sm text-slate-400">
              {(cliente as Cliente).nome_responsavel} — {(cliente as Cliente).email}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">—</p>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Conteúdo do contrato</h3>
        <div
          className="prose prose-invert prose-sm max-w-none text-slate-200
            prose-headings:text-slate-100 prose-h1:text-xl prose-h2:text-base
            prose-strong:text-slate-100"
          dangerouslySetInnerHTML={{ __html: c.conteudo }}
        />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Assinaturas</h3>
        {assinaturas.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma assinatura registrada ainda.</p>
        ) : (
          <div className="space-y-3">
            {assinaturas.map((a, i) => (
              <div key={i} className="rounded-lg border border-border p-3 bg-bg-elevated/50">
                <div className="flex items-center justify-between">
                  <Badge variant="info">{a.papel === "cliente" ? "Cliente" : "Agência"}</Badge>
                  <span className="text-xs text-slate-500">
                    {new Date(a.data).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-mono break-all">IP: {a.ip}</p>
                <p className="text-xs text-slate-500 mt-1 font-mono break-all">
                  Hash: {a.hash.slice(0, 32)}...
                </p>
                {a.signature_data_url && (
                  <div className="mt-2 bg-white rounded p-2 inline-block">
                    <img
                      src={a.signature_data_url}
                      alt="Assinatura"
                      className="h-12"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
