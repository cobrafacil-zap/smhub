import { requireSuperAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AdicionarSuperAdminForm } from "./AdicionarSuperAdminForm";
import {
  toggleSuperAdminAtivoAction,
  deletarSuperAdminAction,
} from "@/lib/actions/super-admin-actions";
import type { SuperAdmin } from "@/types/database";

export const metadata = { title: "Super admins" };

export default async function SuperAdminsPage() {
  await requireSuperAdmin();
  const supabase = createAdminClient();
  const { data: sas } = await supabase
    .from("super_admins")
    .select("*")
    .order("created_at", { ascending: false });
  const list = (sas as SuperAdmin[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super admins"
        description="Equipe de operadores da plataforma. Adicione ou remova super admins."
        breadcrumbs={[{ href: "/super-admin", label: "Início" }, { label: "Super admins" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {list.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Shield className="h-10 w-10" />}
                title="Sem super admins"
                description="Você é o único super admin cadastrado."
              />
            </Card>
          ) : (
            <Card className="!p-0">
              <ul className="divide-y divide-border">
                {list.map((s) => (
                  <li
                    key={s.id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-100 truncate">
                          {s.nome ?? s.email ?? "—"}
                        </p>
                        <Badge variant={s.ativo ? "success" : "danger"}>
                          {s.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {s.email} • desde {formatDate(s.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <form
                        action={toggleSuperAdminAtivoAction.bind(null, s.id, !s.ativo)}
                        className="inline"
                      >
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 rounded-md text-slate-300 hover:bg-bg-elevated transition"
                        >
                          {s.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </form>
                      <form
                        action={deletarSuperAdminAction.bind(null, s.id)}
                        className="inline"
                      >
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 rounded-md text-danger-300 hover:bg-danger-500/10 transition"
                        >
                          Remover
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div>
          <AdicionarSuperAdminForm />
        </div>
      </div>
    </div>
  );
}
