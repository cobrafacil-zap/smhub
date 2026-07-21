import Link from "next/link";
import { requireAgenciaAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { NovoEquipeForm } from "./NovoEquipeForm";
import type { Usuario } from "@/types/database";

export const metadata = { title: "Convidar membro" };

export default async function NovoEquipePage() {
  const session = await requireAgenciaAdmin();
  const admin = createAdminClient();
  const { data: usuarios } = await admin
    .from("usuarios")
    .select("id, nome, email, role")
    .eq("agencia_id", session.profile.agencia_id!)
    .in("role", ["admin_agencia", "membro_equipe"])
    .eq("ativo", true)
    .order("nome");
  const membros = ((usuarios as Usuario[] | null) ?? [])
    .filter((u) => u.id !== session.profile.id)
    .map((u) => ({ id: u.id, nome: u.nome ?? u.email ?? "—" }));

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Convidar membro"
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/equipe", label: "Equipe" },
          { label: "Novo" },
        ]}
        actions={
          <Link href="/admin/equipe">
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />}>Voltar</Button>
          </Link>
        }
      />
      <NovoEquipeForm membros={membros} />
    </div>
  );
}