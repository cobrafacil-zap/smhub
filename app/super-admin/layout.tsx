import { requireSuperAdmin } from "@/lib/auth/session";
import { SidebarSuperAdmin } from "@/components/layout/SidebarSuperAdmin";
import { Topbar } from "@/components/layout/Topbar";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();
  return (
    <div className="min-h-screen bg-bg text-slate-100 flex">
      <SidebarSuperAdmin userName={session.profile.nome} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          userName={session.profile.nome}
          contextLabel="Operador da plataforma"
          homeHref="/super-admin"
        />
        <main className="flex-1 px-4 lg:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
