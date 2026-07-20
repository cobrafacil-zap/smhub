import { requireAgenciaAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { GeradorForm } from "./GeradorForm";
import type { Cliente, ContratoTemplate } from "@/types/database";

export const metadata = { title: "Gerar contrato" };

export default async function GeradorPage({
  searchParams,
}: {
  searchParams: { template?: string };
}) {
  const session = await requireAgenciaAdmin();
  const supabase = createAdminClient();
  const [{ data: clientes }, { data: templates }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome_empresa, nome_responsavel")
      .eq("agencia_id", session.profile.agencia_id!)
      .eq("status", "ativo")
      .order("nome_empresa"),
    supabase
      .from("contrato_templates")
      .select("id, nome")
      .or(`agencia_id.eq.${session.profile.agencia_id},is_global.eq.true`)
      .order("nome"),
  ]);

  const list =
    (clientes as Pick<Cliente, "id" | "nome_empresa" | "nome_responsavel">[] | null) ?? [];
  const tplList = (templates as Pick<ContratoTemplate, "id" | "nome">[] | null) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Gerar contrato"
        description="Preencha os dados e gere um contrato a partir de um template."
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/contratos", label: "Contratos" },
          { label: "Gerar" },
        ]}
      />

      <GeradorForm
        clientes={list}
        templates={tplList}
        defaultTemplateId={searchParams.template}
      />
    </div>
  );
}
