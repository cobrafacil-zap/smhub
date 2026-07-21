import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { GravacoesCalendarClient, type GravacaoItem, type ClienteOption } from "@/components/gravacoes/GravacoesCalendarClient";
import type { Cliente, Gravacao } from "@/types/database";

export const metadata = { title: "Gravações" };

export default async function AdminGravacoesPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const session = await requireAgenciaMember();
  const supabase = createAdminClient();
  const agenciaId = session.profile.agencia_id!;

  // Mês ativo (default = mês atual).
  const today = new Date();
  const [yy, mm] =
    searchParams.mes?.split("-").map(Number) ?? [today.getFullYear(), today.getMonth() + 1];
  const mesAtivo = `${yy}-${String(mm).padStart(2, "0")}`;
  const ultimoDia = new Date(yy, mm, 0).getDate();
  const inicioMes = `${mesAtivo}-01`;
  const fimMes = `${mesAtivo}-${String(ultimoDia).padStart(2, "0")}`;

  // Gravações da agência no mês + lista de clientes (p/ seletor no form).
  const [gravRes, clientesRes] = await Promise.all([
    supabase
      .from("gravacoes")
      .select("*")
      .eq("agencia_id", agenciaId)
      .gte("data", inicioMes)
      .lte("data", fimMes)
      .order("data"),
    supabase
      .from("clientes")
      .select("id, nome_empresa")
      .eq("agencia_id", agenciaId)
      .order("nome_empresa"),
  ]);

  const gravacoes: GravacaoItem[] = (gravRes.data as Gravacao[] | null) ?? [];
  const clientes: ClienteOption[] = (clientesRes.data as Pick<Cliente, "id" | "nome_empresa">[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário de gravações"
        description="Agende e acompanhe as gravações de todos os clientes."
        breadcrumbs={[{ href: "/admin", label: "Dashboard" }, { label: "Gravações" }]}
      />

      <GravacoesCalendarClient
        gravacoes={gravacoes}
        clientes={clientes}
        mesAtivo={mesAtivo}
        basePath="/admin/gravacoes"
        modoCliente={false}
      />
    </div>
  );
}