import { requireSuperAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Settings } from "lucide-react";

export const metadata = { title: "Configurações globais" };

export default async function SuperAdminConfiguracoesPage() {
  await requireSuperAdmin();
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Configurações globais"
        breadcrumbs={[{ href: "/super-admin", label: "Início" }, { label: "Configurações" }]}
      />
      <Card>
        <div className="flex items-center gap-3 text-slate-300">
          <Settings className="h-5 w-5 text-royal-300" />
          <p>Configurações globais em construção (taxas, defaults, chaves de API).</p>
        </div>
      </Card>
    </div>
  );
}
