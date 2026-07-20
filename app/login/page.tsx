import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { getSessionUser } from "@/lib/auth/session";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; email?: string };
}) {
  // Se já está logado, manda direto para o painel conforme a role.
  const session = await getSessionUser();
  if (session) {
    const r = session.profile.role;
    if (r === "super_admin") redirect("/super-admin");
    if (r === "admin_agencia" || r === "membro_equipe") redirect("/admin");
    redirect("/cliente");
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8 animate-logo-in">
          <Logo variant="full" className="!h-36 sm:!h-44 animate-logo-float" />
        </div>
        <div className="card">
          <h1 className="text-xl font-semibold text-slate-100">Entrar na sua conta</h1>
          <p className="text-sm text-slate-400 mt-1">
            Acesse o painel da sua agência ou o portal do cliente.
          </p>
          <div className="mt-6">
            <LoginForm next={searchParams.next} email={searchParams.email} />
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Acesso restrito a agências e clientes convidados.
        </p>
      </div>
    </div>
  );
}
