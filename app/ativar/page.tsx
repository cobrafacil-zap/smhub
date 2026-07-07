import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { AtivarContaForm } from "./AtivarContaForm";

export const metadata = { title: "Ativar conta" };

export default async function AtivarContaPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  if (!token) redirect("/");

  const admin = createAdminClient();
  const { data: signup } = await admin
    .from("signup_tokens")
    .select("id, expira_em, usado_em, email, nome, nome_agencia, plano, agencia_id")
    .eq("token", token)
    .maybeSingle();

  if (!signup) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <Logo variant="full" className="!h-10 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-slate-100 mb-2">Link inválido</h1>
          <p className="text-sm text-slate-400">
            Este link não existe ou foi removido. Verifique o e-mail recebido.
          </p>
        </Card>
      </div>
    );
  }

  if (signup.usado_em) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <Logo variant="full" className="!h-10 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-slate-100 mb-2">Conta já ativada</h1>
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

  if (new Date(signup.expira_em) < new Date()) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <Logo variant="full" className="!h-10 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-slate-100 mb-2">Link expirado</h1>
          <p className="text-sm text-slate-400">
            Este link expirou. Entre em contato com o suporte para gerar um novo.
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
          <h1 className="text-xl font-semibold text-slate-100">Bem-vindo à SM Hub!</h1>
          <p className="text-sm text-slate-400 mt-1">
            Confirme os dados da sua agência e defina sua senha para começar.
          </p>
          <div className="mt-6">
            <AtivarContaForm
              token={token}
              email={signup.email}
              nomeInicial={signup.nome}
              nomeAgenciaInicial={signup.nome_agencia}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
