import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgenciaMember } from "@/lib/auth/session";
import { PrintPlanejamento } from "@/components/calendar/PrintPlanejamento";
import { MONTHS_PT } from "@/lib/constants";
import type { Planejamento, PlanejamentoEntrada } from "@/types/database";

/**
 * /admin/planejamentos/[id]/imprimir
 * View A4 do planejamento pra impressão / "Salvar como PDF".
 */
export default async function ImprimirPlanejamentoPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const admin = createAdminClient();

  // Carrega o planejamento escopado por agencia_id (admin client bypassa
  // RLS — a cláusula .eq("agencia_id") é o que impede vazamento entre
  // agências).
  const { data: plan } = await admin
    .from("planejamentos")
    .select("*")
    .eq("id", params.id)
    .eq("agencia_id", aid)
    .maybeSingle();
  const planejamento = plan as Planejamento | null;
  if (!planejamento) notFound();

  // Entradas + cliente + agência são independentes entre si (todas só
  // precisam de planejamento já resolvido) → rodam juntas em paralelo.
  const [{ data: entRows }, { data: cliente }, { data: agencia }] = await Promise.all([
    admin
      .from("planejamento_entradas")
      .select("*")
      .eq("planejamento_id", planejamento.id)
      .order("data", { ascending: true }),
    admin
      .from("clientes")
      .select("nome_empresa")
      .eq("id", planejamento.cliente_id)
      .maybeSingle(),
    admin
      .from("agencias")
      .select("nome_fantasia, logo_url")
      .eq("id", planejamento.agencia_id)
      .maybeSingle(),
  ]);
  const entradas = (entRows as PlanejamentoEntrada[] | null) ?? [];

  const mesRef = new Date(planejamento.mes_referencia);
  const mesLabel = `${MONTHS_PT[mesRef.getMonth()]} ${mesRef.getFullYear()}`;

  return (
    <PrintPlanejamento
      agenciaNome={agencia?.nome_fantasia ?? null}
      agenciaLogoUrl={(agencia as { logo_url?: string | null } | null)?.logo_url ?? null}
      clienteNome={cliente?.nome_empresa ?? null}
      mesLabel={mesLabel}
      status={planejamento.status}
      objetivoGeral={planejamento.objetivo_geral}
      observacoes={planejamento.observacoes}
      entradas={entradas}
    />
  );
}