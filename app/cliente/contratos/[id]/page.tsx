import { notFound } from "next/navigation";
import { requireCliente } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ContractSigner } from "@/components/contracts/ContractSigner";
import { ContractPDFButton } from "@/components/contracts/ContractPDFButton";
import { CONTRATO_STATUS } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import { assinarContratoAction } from "@/lib/actions/contrato-actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { AssinaturaRegistro, Contrato } from "@/types/database";

export default async function ClienteContratoDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireCliente();
  const supabase = createClient();
  const { data: contrato, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", params.id)
    .eq("cliente_id", session.profile.cliente_id!)
    .single();
  if (error || !contrato) notFound();

  const c = contrato as Contrato;
  const st = CONTRATO_STATUS[c.status];
  const assinaturas: AssinaturaRegistro[] = Array.isArray(c.assinaturas)
    ? (c.assinaturas as unknown as AssinaturaRegistro[])
    : [];
  const jaAssinou = c.status === "assinado" || c.status === "ativo" || c.status === "encerrado";

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={c.titulo}
        breadcrumbs={[
          { href: "/cliente", label: "Início" },
          { href: "/cliente/contratos", label: "Contratos" },
          { label: c.titulo },
        ]}
        actions={
          <>
            <Link href="/cliente/contratos">
              <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />}>Voltar</Button>
            </Link>
            <ContractPDFButton contratoId={c.id} basePath="/cliente/contratos" />
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</h3>
          <Badge variant={st.color} className="text-sm">{st.label}</Badge>
        </Card>
        <Card>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Valor mensal</h3>
          <p className="text-2xl font-bold kpi-num text-slate-100">
            {c.valor_mensal ? formatBRL(c.valor_mensal) : "—"}
          </p>
        </Card>
        <Card>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Vigência</h3>
          <p className="text-sm text-slate-200">
            {c.data_inicio ? formatDate(c.data_inicio) : "—"} →{" "}
            {c.data_fim ? formatDate(c.data_fim) : "—"}
          </p>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Conteúdo do contrato</h3>
        <div
          className="prose prose-invert prose-sm max-w-none text-slate-200
            prose-headings:text-slate-100 prose-h1:text-xl prose-h2:text-base
            prose-strong:text-slate-100"
          dangerouslySetInnerHTML={{ __html: c.conteudo }}
        />
      </Card>

      <ContractSigner
        contratoId={c.id}
        alreadySigned={jaAssinou}
        onSign={async (signatureDataUrl) => {
          "use server";
          return await assinarContratoAction(c.id, signatureDataUrl);
        }}
      />

      {assinaturas.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Registro de assinaturas</h3>
          <div className="space-y-3">
            {assinaturas.map((a, i) => (
              <div key={i} className="rounded-lg border border-border p-3 bg-bg-elevated/50">
                <div className="flex items-center justify-between">
                  <Badge variant={a.papel === "cliente" ? "success" : "info"}>
                    {a.papel === "cliente" ? "Assinatura do cliente" : "Assinatura da agência"}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {new Date(a.data).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-mono break-all">IP: {a.ip}</p>
                <p className="text-xs text-slate-500 mt-1 font-mono break-all">
                  Hash: {a.hash}
                </p>
                {a.signature_data_url && (
                  <div className="mt-2 bg-white rounded p-2 inline-block">
                    <img src={a.signature_data_url} alt="Assinatura" className="h-16" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
