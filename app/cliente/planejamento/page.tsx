import { requireCliente } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import type { DataComemorativa, Planejamento, PlanejamentoEntrada } from "@/types/database";
import { PlanejamentoAprovacaoClient } from "./PlanejamentoAprovacaoClient";

export const metadata = { title: "Planejamento" };

export default async function ClientePlanejamentoPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const session = await requireCliente();
  const supabase = createAdminClient();

  // Mês de referência (default: mês atual)
  const today = new Date();
  const [yy, mm] =
    searchParams.mes?.split("-").map(Number) ?? [today.getFullYear(), today.getMonth() + 1];
  const mesReferencia = `${yy}-${String(mm).padStart(2, "0")}-01`;
  const ultimoDia = new Date(yy, mm, 0).getDate();
  const inicioMes = `${yy}-${String(mm).padStart(2, "0")}-01`;
  const fimMes = `${yy}-${String(mm).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  // Pega planejamento do mês + entradas
  const { data: plan } = await supabase
    .from("planejamentos")
    .select("id, objetivo_geral, observacoes, status")
    .eq("cliente_id", session.profile.cliente_id!)
    .eq("mes_referencia", mesReferencia)
    .maybeSingle();

  // Entradas + datas comemorativas do mês rodam em paralelo (são independentes).
  const [{ data: entradasData }, { data: datasData }] = await Promise.all([
    plan
      ? supabase
          .from("planejamento_entradas")
          .select("*")
          .eq("planejamento_id", (plan as Planejamento).id)
          .order("data")
      : Promise.resolve({ data: null }),
    supabase
      .from("datas_comemorativas")
      .select("*")
      .gte("data", inicioMes)
      .lte("data", fimMes)
      .order("data"),
  ]);

  const entradas = (entradasData as PlanejamentoEntrada[] | null) ?? [];
  const recebeDatas = session.cliente?.recebe_datas_comemorativas !== false;
  const datasComemorativas = recebeDatas
    ? ((datasData as DataComemorativa[] | null) ?? [])
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planejamento"
        description="Aprove, recuse ou peça mudanças nos posts do mês."
        breadcrumbs={[{ href: "/cliente", label: "Início" }, { label: "Planejamento" }]}
      />

      <PlanejamentoAprovacaoClient
        entradas={entradas}
        initialDate={mesReferencia}
        datasComemorativas={datasComemorativas}
        planejamentoId={(plan as Planejamento | null)?.id ?? null}
        clienteSegmento={session.cliente?.segmento}
      />
    </div>
  );
}