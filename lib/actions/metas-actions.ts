"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAgenciaMember } from "@/lib/auth/session";

/**
 * Planejamento mensal (metas) de um cliente: no início do mês a agência
 * define investimento previsto e meta de comissões; ao longo do mês
 * atualiza o realizado (investimento, comissões, leads). Upsert por
 * (cliente_id, mes) — a mesma tela serve p/ criar e editar.
 */
const metasSchema = z.object({
  cliente_id: z.string().uuid(),
  mes: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Mês inválido."),
  investimento_previsto: z.coerce.number().min(0).default(0),
  meta_comissoes: z.coerce.number().min(0).default(0),
  investimento_realizado: z.coerce.number().min(0).default(0),
  comissoes_realizadas: z.coerce.number().min(0).default(0),
  leads_realizados: z.coerce.number().int().min(0).default(0),
  observacoes: z.string().max(1000).optional().nullable().transform((v) => v?.trim() || null),
});

export async function salvarMetasMensaisAction(
  formData: FormData
): Promise<{ ok?: true; error?: string }> {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const parsed = metasSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { error } = await supabase
    .from("metas_mensais")
    .upsert(
      {
        ...parsed.data,
        agencia_id: session.profile.agencia_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cliente_id,mes" }
    );
  if (error) {
    console.error("[salvarMetasMensaisAction]", error);
    return { error: `Erro ao salvar: ${error.message}` };
  }
  revalidatePath(`/admin/clientes/${parsed.data.cliente_id}`);
  return { ok: true };
}
