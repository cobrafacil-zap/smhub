import { headers } from "next/headers";
import { requireClienteOrAgenciaScoped } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { SidebarClient } from "@/components/layout/SidebarClient";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/ui/motion/PageTransition";
import type { Cliente } from "@/types/database";

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireClienteOrAgenciaScoped();
  const isAgencia =
    session.profile.role === "admin_agencia" ||
    session.profile.role === "membro_equipe";

  // Lista de clientes para o switcher — só faz sentido para admin/membro.
  // role=cliente passa `null` (Topbar oculta o switcher).
  let clientesList: { id: string; nome_empresa: string; status: string }[] | null =
    null;
  if (isAgencia && session.profile.agencia_id) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("clientes")
      .select("id, nome_empresa, status")
      .eq("agencia_id", session.profile.agencia_id)
      .order("nome_empresa")
      .limit(500);
    clientesList =
      (data as Pick<Cliente, "id" | "nome_empresa" | "status">[] | null) ?? [];
  }

  // Pathname atual (server-side, sem hook). Usado pelo switcher para
  // preservar a página ao trocar de cliente.
  const pathname = headers().get("x-pathname") ?? "/cliente";

  // Para admin/membro em modo foco, o Topbar mostra:
  //   - userName = nome da admin (mantém a identidade)
  //   - contextLabel = nome do cliente focado
  //   - focusedMode = true (chip "Modo foco")
  // Para cliente real:
  //   - userName = nome do cliente
  //   - contextLabel = nome da empresa
  const userName = isAgencia ? session.profile.nome : session.profile.nome;
  const contextLabel = session.cliente?.nome_empresa;
  const currentClienteId = session.impersonating?.id ?? session.cliente?.id ?? null;

  return (
    <div className="min-h-screen bg-bg text-slate-100 flex relative">
      <div className="mesh-bg" aria-hidden />
      <SidebarClient userName={userName} />
      <div className="flex-1 min-w-0 flex flex-col relative">
        <Topbar
          userName={userName}
          contextLabel={contextLabel}
          homeHref={isAgencia ? "/admin/clientes" : "/cliente"}
          clientesList={clientesList}
          currentClienteId={currentClienteId}
          currentPathname={pathname}
          focusedMode={isAgencia && !!session.impersonating}
        />
        <main className="flex-1 px-4 lg:px-6 py-6">
          <PageTransition>{children}</PageTransition>
        </main>
        <BottomNav variant="cliente" />
      </div>
    </div>
  );
}
