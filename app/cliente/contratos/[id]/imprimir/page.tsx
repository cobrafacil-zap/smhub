import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCliente } from "@/lib/auth/session";
import { PrintContrato } from "@/components/contracts/PrintContrato";

/**
 * /cliente/contratos/[id]/imprimir
 * Espelho do /admin/contratos/[id]/imprimir para clientes.
 */
export default async function ImprimirContratoClientePage({
  params,
}: {
  params: { id: string };
}) {
  // Identidade + escopo de cliente via getSessionUser (JWT local + cache).
  const session = await requireCliente();
  const clienteId = session.profile.cliente_id!;
  const admin = createAdminClient();

  const { data: contrato } = await admin
    .from("contratos")
    .select("id, titulo, conteudo, valor_mensal, duracao_meses, data_inicio, data_fim, status, agencia_id, cliente_id")
    .eq("id", params.id)
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (!contrato) notFound();

  const [{ data: ag }, { data: cliente }] = await Promise.all([
    admin.from("agencias").select("nome_fantasia, cnpj, endereco").eq("id", contrato.agencia_id).maybeSingle(),
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
