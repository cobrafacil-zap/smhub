import { requireCliente } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { User2, Lock, Image as ImageIcon, Sparkles, Building2 } from "lucide-react";
import { TrocarSenhaForm } from "@/components/clientes/TrocarSenhaForm";
import { Reveal } from "@/components/ui/motion/Reveal";
import { FotoPerfilForm, PreferenciasForm, EmpresaInfoForm } from "./ContaClienteForms";
import type { CredencialCliente } from "@/lib/actions/cliente-convite-actions";
import type { EmpresaReferencia } from "@/types/database";

export const metadata = { title: "Minha conta" };

export default async function ClienteContaPage() {
  const session = await requireCliente();
  const c = session.cliente;
  const credenciais =
    (c?.credenciais as unknown as CredencialCliente[] | null) ?? [];
  const referencias =
    (c?.empresas_referencia as unknown as EmpresaReferencia[] | null) ?? [];
  const recebe = c?.recebe_datas_comemorativas !== false; // default true

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Minha conta"
        breadcrumbs={[{ href: "/cliente", label: "Início" }, { label: "Conta" }]}
      />

      <Reveal>
        <Card>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4">
            <ImageIcon className="h-4 w-4 text-royal-300" />
            Foto de perfil
          </h3>
          <FotoPerfilForm initialUrl={c?.foto_perfil ?? null} />
        </Card>
      </Reveal>

      <Reveal delay={50}>
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
                Para alterar nome ou e-mail, peça à sua agência.
              </p>
            </div>
            <div>
              <label className="label">E-mail</label>
              <Input defaultValue={session.profile.email} disabled />
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={100}>
        <Card>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-royal-300" />
            Preferências
          </h3>
          <PreferenciasForm initialRecebe={recebe} />
        </Card>
      </Reveal>

      <Reveal delay={150}>
        <Card>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-royal-300" />
            Informações sobre minha empresa
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Compartilhe com sua agência os acessos e as marcas que você admira.
          </p>
          <EmpresaInfoForm initialCredenciais={credenciais} initialReferencias={referencias} />
        </Card>
      </Reveal>

      <Reveal delay={200}>
        <Card>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4">
            <Lock className="h-4 w-4 text-royal-300" />
            Alterar senha
          </h3>
          <TrocarSenhaForm />
        </Card>
      </Reveal>
    </div>
  );
}