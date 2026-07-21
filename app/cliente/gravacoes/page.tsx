import { requireCliente } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { GravacoesCalendarClient, type GravacaoItem } from "@/components/gravacoes/GravacoesCalendarClient";
import type { Gravacao } from "@/types/database";

export const metadata = { title: "Gravações" };

export default async function ClienteGravacoesPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const session = await requireCliente();
  const supabase = createAdminClient();
  const clienteId = session.profile.cliente_id!;

  // Mês ativo (default = mês atual).
  const today = new Date();
  const [yy, mm] =
    searchParams.mes?.split("-").map(Number) ?? [today.getFullYear(), today.getMonth() + 1];
  const mesAtivo = `${yy}-${String(mm).padStart(2, "0")}`;
  const ultimoDia = new Date(yy, mm, 0).getDate();
  const inicioMes = `${mesAtivo}-01`;
  const fimMes = `${mesAtivo}-${String(ultimoDia).padStart(2, "0")}`;

  const { data } = await supabase
    .from("gravacoes")
    .select("*")
    .eq("cliente_id", clienteId)
    .gte("data", inicioMes)
    .lte("data", fimMes)
    .order("data");

  const gravacoes: GravacaoItem[] = (data as Gravacao[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário de gravações"
        description="Acompanhe e agende as gravações da sua marca."
        breadcrumbs={[{ href: "/cliente", label: "Início" }, { label: "Gravações" }]}
      />

      <GravacoesCalendarClient
        gravacoes={gravacoes}
        clientes={[]}
        mesAtivo={mesAtivo}
        basePath="/cliente/gravacoes"
        modoCliente
      />
    </div>
  );
}