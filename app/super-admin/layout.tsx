import { requireSuperAdmin } from "@/lib/auth/session";
import { SidebarSuperAdmin } from "@/components/layout/SidebarSuperAdmin";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/ui/motion/PageTransition";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();
  return (
    <div className="min-h-screen bg-bg text-slate-100 flex relative">
      <div className="mesh-bg" aria-hidden />
      <SidebarSuperAdmin userName={session.profile.nome} />
      <div className="flex-1 min-w-0 flex flex-col relative">
        <Topbar
          userName={session.profile.nome}
          contextLabel="Operador da plataforma"
          homeHref="/super-admin"
        />
        <main className="flex-1 px-4 lg:px-6 py-6 pb-20 lg:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <BottomNav variant="super-admin" />
    </div>
  );
}
