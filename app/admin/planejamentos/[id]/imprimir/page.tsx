import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = createClient();

  // Carrega o planejamento (RLS já filtra por agencia_id).
  const { data: plan } = await supabase
    .from("planejamentos")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  const planejamento = plan as Planejamento | null;
  if (!planejamento) notFound();

  // Posse: precisa pertencer à agência do usuário.
  if (planejamento.agencia_id !== session.profile.agencia_id) notFound();

  // Entradas do mês.
  const { data: entRows } = await supabase
    .from("planejamento_entradas")
    .select("*")
    .eq("planejamento_id", planejamento.id)
    .order("data", { ascending: true });
  const entradas = (entRows as PlanejamentoEntrada[] | null) ?? [];

  // Cliente + agência (admin client pra evitar fricção de RLS no join).
  const admin = createAdminClient();
  const [{ data: cliente }, { data: agencia }] = await Promise.all([
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