import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { getSessionUser } from "@/lib/auth/session";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; email?: string };
}) {
  // Se já está logado, manda para a home (que redireciona por role)
  const session = await getSessionUser();
  if (session) redirect("/");

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo variant="full" />
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
