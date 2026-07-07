import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatBRL, formatDate } from "@/lib/utils";
import { AssinarPublicoForm } from "./AssinarPublicoForm";
import { CONTRATO_STATUS } from "@/lib/constants";
import { CheckCircle2, FileText, XCircle, Clock } from "lucide-react";

export const metadata = { title: "Assinar contrato" };

export default async function AssinarContratoPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  if (!token) redirect("/login");

  // Página pública — usa admin client para ler o contrato pelo token
  const admin = createAdminClient();
  const { data: contrato, error } = await admin
    .from("contratos")
    .select("id, titulo, conteudo, valor_mensal, duracao_meses, data_inicio, data_fim, status, token_expira_em, cliente_id")
    .eq("token_assinatura", token)
    .maybeSingle();

  if (error || !contrato) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <Logo variant="full" className="!h-10 mx-auto mb-4" />
          <XCircle className="h-10 w-10 text-danger-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-100 mb-2">Link inválido</h1>
          <p className="text-sm text-slate-400">
            Este link não existe ou foi removido. Peça um novo link à sua agência.
          </p>
        </Card>
      </div>
    );
  }

  // Já assinado
  if (contrato.status === "assinado" || contrato.status === "ativo") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <Logo variant="full" className="!h-10 mx-auto mb-4" />
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-100 mb-2">Contrato já assinado</h1>
          <p className="text-sm text-slate-400">
            Este contrato já foi assinado digitalmente. Entre em contato com a agência se precisar de uma via.
          </p>
        </Card>
      </div>
    );
  }

  // Cancelado / encerrado
  if (contrato.status === "cancelado" || contrato.status === "encerrado") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <Logo variant="full" className="!h-10 mx-auto mb-4" />
          <XCircle className="h-10 w-10 text-danger-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-100 mb-2">Contrato indisponível</h1>
          <p className="text-sm text-slate-400">
            Este contrato foi {contrato.status}. Entre em contato com a agência.
          </p>
        </Card>
      </div>
    );
  }

  // Expirado
  if (contrato.token_expira_em && new Date(contrato.token_expira_em) < new Date()) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <Logo variant="full" className="!h-10 mx-auto mb-4" />
          <Clock className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-100 mb-2">Link expirado</h1>
          <p className="text-sm text-slate-400">
            Este link expirou em {formatDate(contrato.token_expira_em)}.
            Peça um novo link à sua agência.
          </p>
        </Card>
      </div>
    );
  }

  const st = CONTRATO_STATUS[contrato.status as keyof typeof CONTRATO_STATUS];

  return (
    <div className="min-h-screen bg-bg p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
      <div className="relative max-w-3xl mx-auto space-y-6">
        <div className="flex justify-center">
          <Logo variant="full" />
        </div>

        {/* Cabeçalho do contrato */}
        <Card>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-royal-300" />
              <h1 className="text-lg font-semibold text-slate-100">{contrato.titulo}</h1>
            </div>
            {st && <Badge variant={st.color}>{st.label}</Badge>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-slate-500">Valor mensal</p>
              <p className="text-slate-200 font-medium">
                {contrato.valor_mensal ? formatBRL(contrato.valor_mensal) : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Duração</p>
              <p className="text-slate-200 font-medium">{contrato.duracao_meses ?? "—"} meses</p>
            </div>
            <div>
              <p className="text-slate-500">Vigência</p>
              <p className="text-slate-200 font-medium">
                {contrato.data_inicio ? formatDate(contrato.data_inicio) : "—"} até{" "}
                {contrato.data_fim ? formatDate(contrato.data_fim) : "—"}
              </p>
            </div>
          </div>
        </Card>

        {/* Conteúdo do contrato */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Conteúdo</h2>
          <div
            className="prose prose-invert prose-sm max-w-none text-slate-200
              prose-headings:text-slate-100 prose-h1:text-xl prose-h2:text-base
              prose-strong:text-slate-100"
            dangerouslySetInnerHTML={{ __html: contrato.conteudo }}
          />
        </Card>

        {/* Assinatura */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Assinatura digital</h2>
          <p className="text-xs text-slate-400 mb-4">
            Ao assinar, você concorda com todos os termos acima. Sua assinatura será registrada
            com data, hora, IP e hash de validação.
          </p>
          <AssinarPublicoForm token={token} />
        </Card>
      </div>
    </div>
  );
}
