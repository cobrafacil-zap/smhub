import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { atualizarRelatorioAction } from "@/lib/actions/agencia-actions";
import { RelatorioForm } from "../../RelatorioForm";
import type { Cliente, Relatorio } from "@/types/database";

export const metadata = { title: "Editar relatório" };

// Wrapper server-action em escopo de MÓDULO (sem fechar sobre `params` do
// render — mesmo motivo do fix do financeiro). Retorna Promise<void>.
async function editarRelatorioSubmitAction(id: string, formData: FormData) {
  "use server";
  const res = await atualizarRelatorioAction(id, formData);
  if (res?.ok) revalidatePath("/admin/relatorios");
}

export default async function EditarRelatorioPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireAgenciaMember();
  const supabase = createAdminClient();
  const aid = session.profile.agencia_id!;

  const [{ data: rel }, { data: clientes }] = await Promise.all([
    supabase
      .from("relatorios")
      .select("*")
      .eq("id", params.id)
      .eq("agencia_id", aid)
      .maybeSingle(),
    supabase
      .from("clientes")
      .select("id, nome_empresa")
      .eq("agencia_id", aid)
      .order("nome_empresa"),
  ]);

  if (!rel) notFound();
  const relatorio = rel as Relatorio;
  const list = (clientes as Pick<Cliente, "id" | "nome_empresa">[] | null) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Editar relatório"
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/relatorios", label: "Relatórios" },
          { label: "Editar" },
        ]}
        actions={
          <Link href="/admin/relatorios">
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />}>Voltar</Button>
          </Link>
        }
      />

      <Card>
        <RelatorioForm
          action={editarRelatorioSubmitAction.bind(null, params.id)}
          clientes={list}
          initial={relatorio}
          submitLabel="Salvar alterações"
        />
      </Card>
    </div>
  );
}