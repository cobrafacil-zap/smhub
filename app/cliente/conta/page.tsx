import { requireCliente } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { User2, Lock } from "lucide-react";
import { TrocarSenhaForm } from "@/components/clientes/TrocarSenhaForm";

export const metadata = { title: "Minha conta" };

export default async function ClienteContaPage() {
  const session = await requireCliente();
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Minha conta"
        breadcrumbs={[{ href: "/cliente", label: "Início" }, { label: "Conta" }]}
      />

      <Card>
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4">
          <User2 className="h-4 w-4 text-royal-300" />
          Dados pessoais
        </h3>
        <div className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <Input defaultValue={session.profile.nome} disabled />
            <p className="text-xs text-slate-500 mt-1">
              Para alterar, peça à sua agência.
            </p>
          </div>
          <div>
            <label className="label">E-mail</label>
            <Input defaultValue={session.profile.email} disabled />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-royal-300" />
          Alterar senha
        </h3>
        <TrocarSenhaForm />
      </Card>
    </div>
  );
}
