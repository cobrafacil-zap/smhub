import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { CriarAgenciaForm } from "../CriarAgenciaForm";

export const metadata = { title: "Nova agência" };

export default async function NovaAgenciaPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Nova agência"
        description="Crie uma agência manualmente: já cria o admin, a assinatura e o trial de 7 dias."
        breadcrumbs={[
          { href: "/super-admin", label: "Início" },
          { href: "/super-admin/agencias", label: "Agências" },
          { label: "Nova" },
        ]}
        actions={
          <Link
            href="/super-admin/agencias"
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            ← Voltar para agências
          </Link>
        }
      />
      <CriarAgenciaForm />
    </div>
  );
}