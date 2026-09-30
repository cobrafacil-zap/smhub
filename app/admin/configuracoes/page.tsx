import { requireAgenciaAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Settings } from "lucide-react";
import { ConfiguracoesForm } from "@/components/forms/ConfiguracoesForm";
import { WhatsappConexaoCard, type WhatsappConexaoResumo } from "@/components/forms/WhatsappConexaoCard";
import { atualizarAgenciaAction } from "@/lib/actions/agencia-actions";
import type { Agencia } from "@/types/database";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const session = await requireAgenciaAdmin();
  const supabase = createAdminClient();
  const { data: agencia } = await supabase
    .from("agencias")
    .select("*")
    .eq("id", session.profile.agencia_id!)
    .single();
  const ag = agencia as Agencia | null;

  const { data: wpp } = await supabase
    .from("agencia_whatsapp_conexoes")
    .select("api_url, instance, status, connected_at")
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();
  const wppInitial = (wpp as WhatsappConexaoResumo | null) ?? null;

  async function action(formData: FormData) {
    "use server";
    await atualizarAgenciaAction(ag!.id, formData);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Configurações"
        description="Dados da agência e personalização."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Configurações" }]}
      />

      {ag ? (
        <ConfiguracoesForm action={action} initial={ag} />
      ) : (
        <Card>
          <p className="text-sm text-slate-500 text-center py-8">Agência não encontrada.</p>
        </Card>
      )}

      <WhatsappConexaoCard initial={wppInitial} />
    </div>
  );
}
