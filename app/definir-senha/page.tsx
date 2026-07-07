import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { DefinirSenhaForm } from "./DefinirSenhaForm";

export const metadata = { title: "Definir senha" };

export default async function DefinirSenhaPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  if (!token) redirect("/login");

  const admin = createAdminClient();
  const { data: convite } = await admin
    .from("convites")
    .select("id, expira_em, usado_em, email, role")
    .eq("token", token)
    .maybeSingle();

  if (!convite) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <Logo variant="full" className="!h-10 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-slate-100 mb-2">Link inválido</h1>
          <p className="text-sm text-slate-400">
            Este link não existe ou foi removido. Peça um novo convite à sua agência.
          </p>
        </Card>
      </div>
    );
  }

  if (convite.usado_em) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <Logo variant="full" className="!h-10 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-slate-100 mb-2">Link já utilizado</h1>
          <p className="text-sm text-slate-400 mb-4">
            Esta conta já foi ativada. Você pode entrar diretamente.
          </p>
          <a href="/login" className="text-royal-300 hover:text-royal-200 text-sm font-medium">
            Ir para o login →
          </a>
        </Card>
      </div>
    );
  }

  if (new Date(convite.expira_em) < new Date()) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <Logo variant="full" className="!h-10 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-slate-100 mb-2">Link expirado</h1>
          <p className="text-sm text-slate-400">
            Este link expirou. Peça um novo convite à sua agência.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo variant="full" />
        </div>
        <Card>
          <h1 className="text-xl font-semibold text-slate-100">Bem-vindo!</h1>
          <p className="text-sm text-slate-400 mt-1">
            Defina sua senha para acessar o portal. Seu e-mail:{" "}
            <strong className="text-slate-200">{convite.email}</strong>
          </p>
          <div className="mt-6">
            <DefinirSenhaForm token={token} />
          </div>
        </Card>
      </div>
    </div>
  );
}
