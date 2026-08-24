import { Suspense } from "react";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { SidebarAdmin } from "@/components/layout/SidebarAdmin";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FocusedClientChip } from "@/components/layout/FocusedClientChip";
import { AssinaturaBanner } from "@/components/billing/AssinaturaBanner";
import { PageTransition } from "@/components/ui/motion/PageTransition";
import { getAssinaturaStatus, countClientesAgencia, trialMaxClientes } from "@/lib/assinatura";
import { getFocusedClienteResumo } from "@/lib/actions/focus-actions";
import type { Agencia } from "@/types/database";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireAgenciaMember é cache() em lib/auth/session — o layout e a page
  // compartilham a mesma resolução da cadeia de auth na requisição.
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;

  // Leitura service-role (bypassa RLS). 1 linha por PK → rápida, mas sem RLS
  // por linha. O banner de assinatura (getAssinaturaStatus + contagem de
  // clientes no trial) fica num Suspense separado pra NÃO bloquear o conteúdo
  // da página — antes o layout esperava essas 2-3 queries antes de renderizar
  // children, e a página inteira esperava junto.
  const admin = createAdminClient();
  const { data: ag } = await admin
    .from("agencias")
    .select("*")
    .eq("id", aid)
    .maybeSingle();
  const agency = (ag as Agencia | null) ?? null;

  // Chip "Foco: {cliente}" no Topbar do admin (conveniência).
  // Roda em paralelo com a leitura da agência para não bloquear.
  const focused = await getFocusedClienteResumo();

  // Lista de clientes para o switcher no Topbar do admin — permite trocar
  // de cliente em foco de qualquer página /admin/* (ex.: ao navegar entre
  // abas do detalhe do cliente) sem voltar para /admin/clientes.
  const { data: clientesData } = await createAdminClient()
    .from("clientes")
    .select("id, nome_empresa, status")
    .eq("agencia_id", aid)
    .order("nome_empresa")
    .limit(500);
  const clientesList =
    (clientesData as { id: string; nome_empresa: string; status: string }[] | null) ?? [];

  return (
    <div className="min-h-screen bg-bg text-slate-100 flex relative">
      <div className="mesh-bg" aria-hidden />
      <SidebarAdmin
        userName={session.profile.nome}
        agencyName={agency?.nome_fantasia}
        agencyLogoUrl={agency?.logo_url}
        role={session.profile.role as "admin_agencia" | "membro_equipe"}
      />
      <div className="flex-1 min-w-0 flex flex-col relative">
        <Topbar
          userName={session.profile.nome}
          contextLabel={agency?.nome_fantasia}
          homeHref="/admin"
          clientesList={clientesList}
          currentClienteId={focused?.id ?? null}
          // Ao trocar o foco a partir do /admin/*, a action leva para a
          // ficha do novo cliente (/admin/clientes/[id]).
          currentPathname="/admin/clientes"
          customBeforeUser={focused ? <FocusedClientChip nomeEmpresa={focused.nome_empresa} /> : null}
        />
        <Suspense fallback={null}>
          <AssinaturaBannerAsync aid={aid} />
        </Suspense>
        <main className="flex-1 px-4 lg:px-6 py-6">
          <PageTransition>{children}</PageTransition>
        </main>
        <BottomNav role={session.profile.role as "admin_agencia" | "membro_equipe"} />
      </div>
    </div>
  );
}

/**
 * Busca o status da assinatura + contagem de clientes (só no trial) e renderiza
 * o banner. Fica num <Suspense> no layout: o restante da página (sidebar, topbar,
 * conteúdo) rende imediatamente, e o banner aparece assim que essas 2-3 queries
 * resolvessem — antes elas bloqueavam a página inteira.
 */
async function AssinaturaBannerAsync({ aid }: { aid: string }) {
  const status = await getAssinaturaStatus(aid);
  const clientesAtuais = status.emTrial ? await countClientesAgencia(aid) : 0;
  return (
    <AssinaturaBanner
      statusEfetivo={status.statusEfetivo}
      diasParaVencer={status.diasParaVencer}
      emTrial={status.emTrial}
      maxClientesTrial={trialMaxClientes()}
      clientesAtuais={clientesAtuais}
    />
  );
}