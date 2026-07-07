import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SidebarAdmin } from "@/components/layout/SidebarAdmin";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AssinaturaBanner } from "@/components/billing/AssinaturaBanner";
import { getAssinaturaStatus, trialMaxClientes } from "@/lib/assinatura";
import type { Agencia } from "@/types/database";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { data: ag } = await supabase
    .from("agencias")
    .select("*")
    .eq("id", session.profile.agencia_id!)
    .maybeSingle();
  const agency = (ag as Agencia | null) ?? null;

  // Status de assinatura + contagem de clientes (para banner de trial)
  const status = await getAssinaturaStatus(session.profile.agencia_id!);
  let clientesAtuais = 0;
  if (status.emTrial) {
    const admin = createAdminClient();
    const { count } = await admin
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("agencia_id", session.profile.agencia_id!);
    clientesAtuais = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-bg text-slate-100 flex">
      <SidebarAdmin
        userName={session.profile.nome}
        agencyName={agency?.nome_fantasia}
        agencyLogoUrl={agency?.logo_url}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          userName={session.profile.nome}
          contextLabel={agency?.nome_fantasia}
          homeHref="/admin"
        />
        <AssinaturaBanner
          statusEfetivo={status.statusEfetivo}
          diasParaVencer={status.diasParaVencer}
          emTrial={status.emTrial}
          maxClientesTrial={trialMaxClientes()}
          clientesAtuais={clientesAtuais}
        />
        <main className="flex-1 px-4 lg:px-6 py-6 pb-20 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
