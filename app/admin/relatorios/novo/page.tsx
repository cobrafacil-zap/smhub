import Link from "next/link";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { criarRelatorioAction } from "@/lib/actions/agencia-actions";
import { RelatorioForm } from "../RelatorioForm";
import type { Cliente } from "@/types/database";

export const metadata = { title: "Novo relatório" };

export default async function NovoRelatorioPage({
  searchParams,
}: {
  searchParams: { cliente?: string };
}) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome_empresa")
    .eq("agencia_id", session.profile.agencia_id!)
    .order("nome_empresa");
  const list = (clientes as Pick<Cliente, "id" | "nome_empresa">[] | null) ?? [];

  async function action(formData: FormData) {
    "use server";
    const res = await criarRelatorioAction(formData);
    if (res?.ok) revalidatePath("/admin/relatorios");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Novo relatório"
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/relatorios", label: "Relatórios" },
          { label: "Novo" },
        ]}
        actions={
          <Link href="/admin/relatorios">
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />}>Voltar</Button>
          </Link>
        }
      />

      <Card>
        <RelatorioForm
          action={action}
          clientes={list}
          initial={searchParams.cliente ? { cliente_id: searchParams.cliente } : undefined}
        />
      </Card>
    </div>
  );
}