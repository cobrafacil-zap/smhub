import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { requireAgenciaMember } from "@/lib/auth/session";
import { NovaTransacaoForm } from "./NovaTransacaoForm";

export const metadata = { title: "Novo lançamento" };

export default async function NovaTransacaoPage() {
  await requireAgenciaMember();

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Novo lançamento"
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/financeiro", label: "Financeiro" },
          { label: "Novo" },
        ]}
        actions={
          <Link href="/admin/financeiro">
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />}>Voltar</Button>
          </Link>
        }
      />

      <NovaTransacaoForm />
    </div>
  );
}