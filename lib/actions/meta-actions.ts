"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgenciaAdmin, requireAgenciaMember } from "@/lib/auth/session";
import { buildAuthUrl } from "@/lib/meta-oauth";
import { importarMetricasMeta } from "@/lib/meta";
import type { MetaProvider, MetricasImportadas } from "@/types/database";

type ConnectResult = { ok: true; url: string } | { ok: false; error: string };
type SimpleResult = { ok?: true; error?: string };
type ImportResult =
  | { ok: true; metricas: MetricasImportadas }
  | { ok: false; error: string };

const providerSchema = z.enum(["instagram", "facebook"]);

/**
 * Inicia o OAuth da Meta: valida que o cliente pertence à agência e devolve a
 * URL de autorização para o browser redirecionar. Apenas admin da agência.
 */
export async function iniciarMetaOAuthAction(
  clienteId: string,
  providerRaw: string
): Promise<ConnectResult> {
  const session = await requireAgenciaAdmin();
  const parsed = providerSchema.safeParse(providerRaw);
  if (!parsed.success) return { ok: false, error: "Plataforma inválida." };
  const provider = parsed.data as MetaProvider;

  const supabase = createClient();
  const { data: cli } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();
  if (!cli) return { ok: false, error: "Cliente não encontrado." };

  const url = buildAuthUrl({
    clienteId,
    provider,
    agenciaId: session.profile.agencia_id!,
    userId: session.id,
  });
  return { ok: true, url };
}

/**
 * Remove a conexão OAuth de um provider. Apenas admin da agência.
 */
export async function desconectarMetaOAuthAction(
  clienteId: string,
  providerRaw: string
): Promise<SimpleResult> {
  const session = await requireAgenciaAdmin();
  const parsed = providerSchema.safeParse(providerRaw);
  if (!parsed.success) return { error: "Plataforma inválida." };
  const provider = parsed.data as MetaProvider;

  const admin = createAdminClient();
  const { error } = await admin
    .from("cliente_oauth_contas")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("provider", provider)
    .eq("agencia_id", session.profile.agencia_id!);

  revalidatePath(`/admin/clientes/${clienteId}`);
  if (error) return { error: "Erro ao desconectar a conta." };
  return { ok: true };
}

const importSchema = z.object({
  cliente_id: z.string().uuid(),
  provider: providerSchema,
  mes_referencia: z.string().min(7), // YYYY-MM-DD
});

/**
 * Importa as métricas do mês selecionado da Meta e devolve o objeto parcial
 * para o formulário pré-preencher. Admin ou membro da agência.
 */
export async function importarMetricasAction(formData: FormData): Promise<ImportResult> {
  const session = await requireAgenciaMember();
  const parsed = importSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = createClient();
  const { data: cli } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", parsed.data.cliente_id)
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();
  if (!cli) return { ok: false, error: "Cliente não encontrado." };

  return importarMetricasMeta({
    clienteId: parsed.data.cliente_id,
    provider: parsed.data.provider as MetaProvider,
    mesReferencia: parsed.data.mes_referencia,
  });
}