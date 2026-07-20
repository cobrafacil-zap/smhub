import { requireSuperAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPlatformConfig } from "@/lib/platform";
import { salvarLogoPlataformaAction } from "@/lib/actions/super-admin-actions";
import { PlatformLogoForm } from "./PlatformLogoForm";

export const metadata = { title: "Configurações globais" };

export default async function SuperAdminConfiguracoesPage() {
  await requireSuperAdmin();
  const config = await getPlatformConfig();

  async function action(formData: FormData) {
    "use server";
    return salvarLogoPlataformaAction(undefined, formData);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Configurações globais"
        description="Identidade visual da plataforma (logos claro/escuro)."
        breadcrumbs={[
          { href: "/super-admin", label: "Início" },
          { label: "Configurações" },
        ]}
      />

      <PlatformLogoForm
        action={action}
        initialLight={config.logo_url_light}
        initialDark={config.logo_url_dark}
      />
    </div>
  );
}