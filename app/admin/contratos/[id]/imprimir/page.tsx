import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgenciaMember } from "@/lib/auth/session";
import { PrintContrato } from "@/components/contracts/PrintContrato";

/**
 * /admin/contratos/[id]/imprimir
 * Página de impressão do contrato — o usuário clica em "Baixar PDF"
 * e isso abre esta view. Aí o navegador faz Ctrl+P → Salvar como PDF.
 *
 * Essa rota funciona como fallback para quando o @react-pdf/renderer
 * não consegue rodar no Vercel serverless.
 */
export default async function ImprimirContratoPage({
  params,
}: {
  params: { id: string };
}) {
  // Identidade + escopo de agência via getSessionUser (JWT local + cache).
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const admin = createAdminClient();

  // Lê o contrato (escopado por agencia_id — admin client bypassa RLS).
  const { data: contrato } = await admin
    .from("contratos")
    .select("id, titulo, conteudo, valor_mensal, duracao_meses, data_inicio, data_fim, status, agencia_id, cliente_id")
    .eq("id", params.id)
    .eq("agencia_id", aid)
    .maybeSingle();

  if (!contrato) notFound();

  // Pega dados da agência e cliente para o cabeçalho/rodapé.
  const [{ data: ag }, { data: cliente }] = await Promise.all([
    admin.from("agencias").select("nome_fantasia, cnpj, endereco").eq("id", aid).maybeSingle(),
    admin.from("clientes").select("nome_empresa, nome_responsavel, cnpj_cpf").eq("id", contrato.cliente_id).maybeSingle(),
  ]);

  return (
    <PrintContrato
      titulo={contrato.titulo}
      conteudo={contrato.conteudo}
      valorMensal={contrato.valor_mensal}
      duracaoMeses={contrato.duracao_meses}
      dataInicio={contrato.data_inicio}
      dataFim={contrato.data_fim}
      status={contrato.status}
      agenciaNome={ag?.nome_fantasia ?? null}
      agenciaCnpj={ag?.cnpj ?? null}
      agenciaEndereco={ag?.endereco ?? null}
      clienteNome={cliente?.nome_empresa ?? null}
      clienteResponsavel={cliente?.nome_responsavel ?? null}
      clienteCnpj={cliente?.cnpj_cpf ?? null}
    />
  );
}
