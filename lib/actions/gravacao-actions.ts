"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireClienteOuAgencia } from "@/lib/auth/session";
import type { GravacaoStatus } from "@/types/database";

// ============================================================================
// SCHEMA
// ============================================================================
const STATUS_VALUES: GravacaoStatus[] = [
  "agendada",
  "confirmada",
  "concluida",
  "cancelada",
];

const gravacaoSchema = z.object({
  titulo: z.string().min(2, "Título é obrigatório."),
  data: z.string().min(8, "Data é obrigatória."),
  hora: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  local: z.string().optional().nullable(),
  status: z.enum(STATUS_VALUES as [string, ...string[]]).default("agendada"),
  cliente_id: z.string().uuid().optional().nullable(),
});

export type GravacaoState = { error?: string; ok?: boolean } | undefined;

function parseFormData(formData: FormData) {
  return gravacaoSchema.safeParse({
    titulo: formData.get("titulo"),
    data: formData.get("data"),
    hora: formData.get("hora") || null,
    descricao: formData.get("descricao") || null,
    local: formData.get("local") || null,
    status: formData.get("status") || "agendada",
    cliente_id: formData.get("cliente_id") || null,
  });
}

// ============================================================================
// CRIAR — cliente OU agência (ambos editam). RLS faz o escopo final.
// ============================================================================
export async function criarGravacaoAction(
  _prev: GravacaoState,
  formData: FormData
): Promise<GravacaoState> {
  const session = await requireClienteOuAgencia();
  const supabase = createClient();
  const isCliente = session.profile.role === "cliente";
  const aid = session.profile.agencia_id;

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Cliente usa o próprio cliente_id; agência usa o selecionado no form.
  const cliente_id = isCliente ? session.profile.cliente_id : parsed.data.cliente_id;
  if (!cliente_id) return { error: "Selecione o cliente." };
  if (!aid) return { error: "Agência não definida para o usuário." };

  const { error } = await supabase.from("gravacoes").insert({
    agencia_id: aid,
    cliente_id,
    data: parsed.data.data,
    hora: parsed.data.hora || null,
    titulo: parsed.data.titulo,
    descricao: parsed.data.descricao ?? null,
    local: parsed.data.local ?? null,
    status: parsed.data.status as GravacaoStatus,
    criado_por: session.profile.id,
  });
  if (error) return { error: `Erro ao criar gravação: ${error.message}` };

  revalidatePath("/cliente/gravacoes");
  revalidatePath("/admin/gravacoes");
  return { ok: true };
}

// ============================================================================
// ATUALIZAR
// ============================================================================
export async function atualizarGravacaoAction(
  id: string,
  formData: FormData
): Promise<GravacaoState> {
  const session = await requireClienteOuAgencia();
  const supabase = createClient();
  const isCliente = session.profile.role === "cliente";

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const update: Record<string, unknown> = {
    titulo: parsed.data.titulo,
    data: parsed.data.data,
    hora: parsed.data.hora || null,
    descricao: parsed.data.descricao ?? null,
    local: parsed.data.local ?? null,
    status: parsed.data.status as GravacaoStatus,
  };
  // Só a agência pode trocar o cliente da gravação.
  if (!isCliente && parsed.data.cliente_id) {
    update.cliente_id = parsed.data.cliente_id;
  }

  const { error } = await supabase.from("gravacoes").update(update).eq("id", id);
  if (error) return { error: "Erro ao atualizar gravação." };

  revalidatePath("/cliente/gravacoes");
  revalidatePath("/admin/gravacoes");
  return { ok: true };
}

// ============================================================================
// EXCLUIR
// ============================================================================
export async function deletarGravacaoAction(id: string): Promise<GravacaoState> {
  await requireClienteOuAgencia();
  const supabase = createClient();

  const { error } = await supabase.from("gravacoes").delete().eq("id", id);
  if (error) return { error: "Erro ao excluir gravação." };

  revalidatePath("/cliente/gravacoes");
  revalidatePath("/admin/gravacoes");
  return { ok: true };
}