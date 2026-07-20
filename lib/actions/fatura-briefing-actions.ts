"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgenciaAdmin, requireAgenciaMember } from "@/lib/auth/session";
import type { Fatura } from "@/types/database";

// ============================================================================
// FATURAS
// ============================================================================
const faturaSchema = z.object({
  cliente_id: z.string().uuid(),
  numero: z.string().optional().nullable(),
  data_emissao: z.string().min(8),
  data_vencimento: z.string().min(8),
  valor: z.coerce.number().min(0),
  descricao: z.string().optional().nullable(),
});

export async function criarFaturaAction(formData: FormData) {
  const session = await requireAgenciaAdmin();
  const parsed = faturaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };
  const supabase = createClient();

  // Gera número sequencial simples: AG-YYYYMM-####
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { count } = await supabase
    .from("faturas")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", session.profile.agencia_id!);
  const numero = parsed.data.numero ?? `${session.profile.agencia_id!.slice(0, 4).toUpperCase()}-${ym}-${String((count ?? 0) + 1).padStart(4, "0")}`;

  // A tabela `faturas` não tem `data_emissao` nem `descricao` — usa
  // `competencia` (date) e `itens` (jsonb). Mapeamos o que vem do form.
  const { data_emissao, descricao, ...rest } = parsed.data;
  const { error } = await supabase.from("faturas").insert({
    ...rest,
    competencia: data_emissao,
    itens: [{ descricao: descricao ?? `Fatura ${numero}`, valor: parsed.data.valor }],
    numero,
    agencia_id: session.profile.agencia_id!,
    status: "pendente",
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/financeiro");
  revalidateTag("financeiro-data");
  revalidatePath("/admin/clientes");
  return { ok: true };
}

export async function atualizarFaturaStatusAction(id: string, status: Fatura["status"]) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { data: fat } = await supabase
    .from("faturas")
    .select("cliente_id")
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!)
    .single();
  // Só atualiza o status. Não setamos data_pagamento aqui pra não depender da
  // migration 0023 (coluna pode não existir ainda) — a "Receita do mês" usa
  // `competencia` da fatura, que sempre existe.
  const { error } = await supabase
    .from("faturas")
    .update({ status })
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: error.message };
  if (fat?.cliente_id) revalidatePath(`/admin/clientes/${fat.cliente_id}`);
  revalidatePath("/admin/financeiro");
  revalidateTag("financeiro-data");
  revalidatePath("/admin/clientes");
  return { ok: true };
}

export async function deletarFaturaAction(id: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const { data: fat } = await supabase
    .from("faturas")
    .select("cliente_id")
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!)
    .single();
  await supabase
    .from("faturas")
    .delete()
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (fat?.cliente_id) revalidatePath(`/admin/clientes/${fat.cliente_id}`);
  revalidatePath("/admin/financeiro");
  revalidateTag("financeiro-data");
  revalidatePath("/admin/clientes");
}

// ============================================================================
// FATURA ARQUIVOS (boleto / NF / outro)
// ============================================================================
export async function uploadFaturaArquivoAction(formData: FormData) {
  const session = await requireAgenciaMember();
  const aid = session.profile.agencia_id!;
  const supabase = createClient();
  const admin = createAdminClient();

  const faturaId = String(formData.get("fatura_id") ?? "");
  const tipoRaw = String(formData.get("tipo") ?? "outro");
  const tipo = ["boleto", "nota_fiscal", "outro"].includes(tipoRaw) ? tipoRaw : "outro";
  const file = formData.get("file") as File | null;

  if (!faturaId) return { error: "Fatura inválida." };
  if (!file || file.size === 0) return { error: "Selecione um arquivo." };

  // Garante que a fatura pertence à agência
  const { data: fat } = await supabase
    .from("faturas")
    .select("id, cliente_id")
    .eq("id", faturaId)
    .eq("agencia_id", aid)
    .maybeSingle();
  if (!fat) return { error: "Fatura não encontrada." };

  // Sobe arquivo no bucket invoices (path: agencia_id/fatura_id/<timestamp>-<nome>)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${aid}/${faturaId}/${Date.now()}-${safeName}`;
  const { error: upErr } = await admin.storage
    .from("invoices")
    .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
  if (upErr) return { error: `Erro no upload: ${upErr.message}` };

  // Pega URL pública (bucket invoices é privado mas o app tem policy de leitura autenticada)
  const { data: pub } = admin.storage.from("invoices").getPublicUrl(path);
  const url = pub.publicUrl;

  // Insere metadata em fatura_arquivos
  const { error: insErr } = await supabase.from("fatura_arquivos").insert({
    fatura_id: faturaId,
    agencia_id: aid,
    tipo: tipo as "boleto" | "nota_fiscal" | "outro",
    nome: file.name,
    url,
    mime: file.type || null,
    tamanho: file.size,
  });
  if (insErr) return { error: insErr.message };

  if (fat.cliente_id) revalidatePath(`/admin/clientes/${fat.cliente_id}`);
  revalidatePath("/admin/financeiro");
  revalidateTag("financeiro-data");
  return { ok: true };
}

export async function deletarFaturaArquivoAction(id: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const admin = createAdminClient();

  const { data: arq } = await supabase
    .from("fatura_arquivos")
    .select("id, url, fatura_id")
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();
  if (!arq) return { error: "Arquivo não encontrado." };

  // Tenta remover do storage (path após /storage/v1/object/public/invoices/ ou /sign/)
  try {
    const url = arq.url as string;
    const marker = "/invoices/";
    const idx = url.indexOf(marker);
    if (idx > 0) {
      const path = url.substring(idx + marker.length).split("?")[0];
      await admin.storage.from("invoices").remove([path]);
    }
  } catch {
    // ignora — pode já ter sido removido
  }

  const { data: fat } = await supabase
    .from("faturas")
    .select("cliente_id")
    .eq("id", arq.fatura_id)
    .maybeSingle();

  await supabase.from("fatura_arquivos").delete().eq("id", id);
  if (fat?.cliente_id) revalidatePath(`/admin/clientes/${fat.cliente_id}`);
  revalidatePath("/admin/financeiro");
  revalidateTag("financeiro-data");
  return { ok: true };
}

/**
 * Gera mensalidade para um cliente específico.
 * Recebe cliente_id e mes_referencia (YYYY-MM).
 * Se já existir fatura no mesmo vencimento, não duplica.
 */
export async function gerarFaturaClienteAction(clienteId: string, mesReferencia: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  if (!/^\d{4}-\d{2}$/.test(mesReferencia)) return { error: "Mês inválido." };
  const [ano, mes] = mesReferencia.split("-").map(Number);

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, valor_mensal, dia_vencimento, nome_empresa")
    .eq("id", clienteId)
    .eq("agencia_id", session.profile.agencia_id!)
    .single();
  if (!cliente) return { error: "Cliente não encontrado." };
  if (!cliente.valor_mensal) return { error: "Cliente sem valor mensal." };

  const dia = Math.min(cliente.dia_vencimento ?? 10, 28);
  const venc = new Date(ano, mes - 1, dia).toISOString().slice(0, 10);

  const { data: existe } = await supabase
    .from("faturas")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("data_vencimento", venc)
    .maybeSingle();
  if (existe) return { error: "Já existe fatura para esse mês." };

  // competencia é date: precisa de YYYY-MM-DD (não só YYYY-MM).
  const { error } = await supabase.from("faturas").insert({
    cliente_id: clienteId,
    agencia_id: session.profile.agencia_id!,
    competencia: `${mesReferencia}-01`,
    data_vencimento: venc,
    valor: cliente.valor_mensal,
    itens: [{ descricao: `Mensalidade ${mesReferencia}`, valor: cliente.valor_mensal }],
    status: "pendente",
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin/financeiro");
  revalidateTag("financeiro-data");
  return { ok: true };
}

export async function gerarFaturasMesAction(formData: FormData) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const mesReferencia = String(formData.get("mes_referencia") ?? ""); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(mesReferencia)) return { error: "Mês inválido" };
  const [ano, mes] = mesReferencia.split("-").map(Number);

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, valor_mensal, dia_vencimento, nome_empresa")
    .eq("agencia_id", session.profile.agencia_id!)
    .eq("status", "ativo");
  const list = (clientes ?? []) as {
    id: string;
    valor_mensal: number | null;
    dia_vencimento: number | null;
    nome_empresa: string | null;
  }[];
  if (list.length === 0) return { error: "Nenhum cliente ativo." };

  // Dedup em LOTE: busca de uma vez todas as faturas JÁ existentes desse mês
  // (por competencia) pra esses clientes. Antes era 1 SELECT + 1 INSERT por
  // cliente no loop = 2N round-trips (N+1). Agora 1 SELECT + 1 INSERT em lote.
  const competencia = `${mesReferencia}-01`;
  const clienteIds = list.map((c) => c.id);
  const { data: existentes } = await supabase
    .from("faturas")
    .select("cliente_id")
    .in("cliente_id", clienteIds)
    .eq("competencia", competencia);
  const jaTem = new Set((existentes ?? []).map((f) => (f as { cliente_id: string }).cliente_id));

  const inserts = list
    .filter((c) => c.valor_mensal && !jaTem.has(c.id))
    .map((c) => {
      const dia = Math.min(c.dia_vencimento ?? 10, 28);
      const venc = new Date(ano, mes - 1, dia).toISOString().slice(0, 10);
      return {
        cliente_id: c.id,
        agencia_id: session.profile.agencia_id!,
        competencia,
        data_vencimento: venc,
        valor: c.valor_mensal!,
        itens: [{ descricao: `Mensalidade ${mesReferencia}`, valor: c.valor_mensal! }],
        status: "pendente" as const,
      };
    });

  let created = 0;
  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from("faturas").insert(inserts);
    if (insErr) return { error: insErr.message };
    created = inserts.length;
  }
  revalidatePath("/admin/financeiro");
  revalidateTag("financeiro-data");
  return { ok: true, count: created };
}

// ============================================================================
// BRIEFINGS
// ============================================================================
const briefingSchema = z.object({
  cliente_id: z.string().uuid(),
  respostas: z.string(), // JSON stringificado
});

export async function criarBriefingAction(formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const parsed = briefingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };
  let respostas: unknown;
  try {
    respostas = JSON.parse(parsed.data.respostas);
  } catch {
    return { error: "Respostas inválidas" };
  }
  const { error } = await supabase.from("briefings").insert({
    cliente_id: parsed.data.cliente_id,
    agencia_id: session.profile.agencia_id!,
    respostas: respostas as object,
    preenchido_por: session.id,
    // Briefing preenchido pelo admin é INTERNO: o cliente não vê (policy 0021).
    interno: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/briefings");
  revalidatePath(`/admin/clientes/${parsed.data.cliente_id}`);
  revalidatePath("/cliente");
  return { ok: true };
}

export async function deletarBriefingAction(id: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const { data: briefing } = await supabase
    .from("briefings")
    .select("cliente_id")
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!)
    .single();
  await supabase
    .from("briefings")
    .delete()
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (briefing?.cliente_id) revalidatePath(`/admin/clientes/${briefing.cliente_id}`);
  revalidatePath("/admin/briefings");
}

export async function atualizarBriefingAction(id: string, formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const respostasStr = String(formData.get("respostas") ?? "");
  let respostas: unknown;
  try {
    respostas = JSON.parse(respostasStr);
  } catch {
    return { error: "Respostas inválidas" };
  }
  // Confirma posse (mesma agência) e pega cliente_id para revalidar.
  const { data: br, error: selErr } = await supabase
    .from("briefings")
    .select("cliente_id, agencia_id")
    .eq("id", id)
    .single();
  if (selErr || !br || br.agencia_id !== session.profile.agencia_id) {
    return { error: "Briefing não encontrado." };
  }
  const { error } = await supabase
    .from("briefings")
    .update({ respostas: respostas as object })
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: error.message };
  revalidatePath("/admin/briefings");
  if (br.cliente_id) revalidatePath(`/admin/clientes/${br.cliente_id}`);
  revalidatePath("/cliente");
  return { ok: true };
}
