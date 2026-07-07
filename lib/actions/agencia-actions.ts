"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgenciaAdmin, requireAgenciaMember } from "@/lib/auth/session";
import { CLIENTE_SEGMENTOS } from "@/lib/constants";
import type { Cliente, EntradaStatus, Usuario } from "@/types/database";

export type CriarClienteState = { error?: string; ok?: boolean } | undefined;

// ============================================================================
// CLIENTES
// ============================================================================
const clienteSchema = z.object({
  nome_empresa: z.string().min(2),
  nome_responsavel: z.string().min(2),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  cnpj_cpf: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  segmento: z.enum(CLIENTE_SEGMENTOS),
  status: z.enum(["ativo", "inativo", "pausado"]).default("ativo"),
  valor_mensal: z.coerce.number().min(0).optional().nullable(),
  dia_vencimento: z.coerce.number().int().min(1).max(31).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export async function criarClienteAction(
  _prev: CriarClienteState,
  formData: FormData
): Promise<CriarClienteState> {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const raw = Object.fromEntries(formData);
  const parsed = clienteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...parsed.data, agencia_id: session.profile.agencia_id })
    .select("id")
    .single();
  if (error) {
    console.error("[criarClienteAction] supabase error:", error);
    return { error: `Erro ao criar cliente: ${error.message} (${error.code ?? "sem code"})` };
  }
  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${data!.id}?convidar=1`);
}

export async function atualizarClienteAction(id: string, formData: FormData) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const raw = Object.fromEntries(formData);
  const parsed = clienteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { error } = await supabase
    .from("clientes")
    .update(parsed.data)
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: "Erro ao atualizar cliente." };
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  return { ok: true };
}

export async function deletarClienteAction(id: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ status: "inativo" })
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: "Erro." };
  revalidatePath("/admin/clientes");
  return { ok: true };
}

// ============================================================================
// EQUIPE
// ============================================================================
const equipeSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  cargo: z.string().optional().nullable(),
  custo_mensal: z.coerce.number().min(0).optional().nullable(),
  telefone: z.string().optional().nullable(),
  role: z.enum(["admin_agencia", "membro_equipe"]).default("membro_equipe"),
});

export async function criarEquipeAction(
  _prev: unknown,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const raw = Object.fromEntries(formData);
  const parsed = equipeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // Cria usuário no auth
  const { data: signData, error: signErr } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: "smhub123", // senha temporária — admin pode redefinir
    options: { data: { nome: parsed.data.nome } },
  });
  if (signErr || !signData.user) {
    return { error: signErr?.message ?? "Erro ao criar usuário no Auth." };
  }
  // Cria registro em usuarios
  const { error } = await supabase.from("usuarios").insert({
    user_id: signData.user.id,
    agencia_id: session.profile.agencia_id,
    nome: parsed.data.nome,
    email: parsed.data.email,
    cargo: parsed.data.cargo ?? null,
    telefone: parsed.data.telefone ?? null,
    custo_mensal: parsed.data.custo_mensal ?? 0,
    role: parsed.data.role,
  });
  if (error) {
    // rollback do auth user para não ficar órfão
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      await createAdminClient().auth.admin.deleteUser(signData.user.id);
    } catch {
      // ignora
    }
    return { error: `Erro ao criar membro: ${error.message}` };
  }
  revalidatePath("/admin/equipe");
  redirect("/admin/equipe?convidado=1");
}

export async function atualizarEquipeAction(id: string, formData: FormData) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const raw = Object.fromEntries(formData);
  const parsed = equipeSchema.omit({ email: true }).partial().safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const custoMensal = raw.custo_mensal
    ? Number(String(raw.custo_mensal).replace(",", "."))
    : 0;
  const { error } = await supabase
    .from("usuarios")
    .update({
      nome: parsed.data.nome,
      cargo: parsed.data.cargo ?? null,
      telefone: parsed.data.telefone ?? null,
      role: parsed.data.role,
      custo_mensal: isFinite(custoMensal) && custoMensal >= 0 ? custoMensal : 0,
    })
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: "Erro." };
  revalidatePath("/admin/equipe");
  return { ok: true };
}

export async function toggleEquipeAtivoAction(id: string, ativo: boolean) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  await supabase
    .from("usuarios")
    .update({ ativo })
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  revalidatePath("/admin/equipe");
}

// ============================================================================
// DATAS COMEMORATIVAS
// ============================================================================
const dataSchema = z.object({
  data: z.string(),
  nome: z.string().min(2),
  segmento: z.array(z.string()).optional().nullable(),
});

export async function criarDataComemorativaAction(formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const segmento = String(formData.get("segmento") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const raw = {
    data: formData.get("data"),
    nome: formData.get("nome"),
    segmento: segmento.length ? segmento : null,
  };
  const parsed = dataSchema.safeParse(raw);
  if (!parsed.success) return { error: "Dados inválidos." };
  const { error } = await supabase.from("datas_comemorativas").insert({
    ...parsed.data,
    agencia_id: session.profile.agencia_id!,
  });
  if (error) return { error: "Erro." };
  revalidatePath("/admin/datas-comemorativas");
  return { ok: true };
}

/**
 * Importa datas comemorativas via CSV (upload de planilha).
 * Colunas esperadas (header): data;nome;segmento (aceita vírgula também).
 * data aceita YYYY-MM-DD ou DD/MM/YYYY. segmento é split por , ou ; em array.
 * Linhas inválidas são puladas (contabilizadas em erros).
 */
export async function importarDatasCsvAction(prev: unknown, formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const file = formData.get("arquivo");
  if (!(file instanceof File)) return { error: "Nenhum arquivo enviado." };
  if (file.size > 2 * 1024 * 1024) return { error: "Arquivo muito grande (máx 2 MB)." };

  let texto: string;
  try {
    texto = await file.text();
  } catch {
    return { error: "Não foi ler o arquivo." };
  }
  if (!texto.trim()) return { error: "Arquivo vazio." };

  // Detecta separador (Excel pt-BR usa ;, mas aceita ,).
  const separador = (texto.split("\n")[0] ?? "").includes(";") ? ";" : ",";

  function parseCsvLine(linha: string): string[] {
    const campos: string[] = [];
    let atual = "";
    let dentroAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const ch = linha[i];
      if (ch === '"') {
        dentroAspas = !dentroAspas;
      } else if (ch === separador && !dentroAspas) {
        campos.push(atual);
        atual = "";
      } else {
        atual += ch;
      }
    }
    campos.push(atual);
    return campos.map((c) => c.trim());
  }

  function normalizarData(v: string): string | null {
    const s = v.trim();
    if (!s) return null;
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD/MM/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, d, mes, a] = m;
      return `${a}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return null;
  }

  const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length === 0) return { error: "Nenhuma linha encontrada." };

  // Header
  const header = parseCsvLine(linhas[0]).map((c) => c.toLowerCase());
  const idxData = header.findIndex((h) => h.startsWith("data"));
  const idxNome = header.findIndex((h) => h.startsWith("nome"));
  if (idxData < 0 || idxNome < 0) {
    return { error: "Cabeçalho inválido. Use: data;nome;segmento" };
  }
  const idxSeg = header.findIndex((h) => h.startsWith("segmento"));

  const registros: { data: string; nome: string; segmento: string[] | null; agencia_id: string }[] = [];
  let erros = 0;
  for (let i = 1; i < linhas.length; i++) {
    const campos = parseCsvLine(linhas[i]);
    const data = normalizarData(campos[idxData] ?? "");
    const nome = (campos[idxNome] ?? "").trim();
    if (!data || !nome) {
      erros++;
      continue;
    }
    const segRaw = idxSeg >= 0 ? (campos[idxSeg] ?? "").trim() : "";
    const segmento = segRaw
      ? segRaw.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : null;
    registros.push({ data, nome, segmento, agencia_id: session.profile.agencia_id! });
  }

  if (registros.length === 0) return { error: `Nenhuma linha válida. (${erros} ignorada(s))` };

  const { error } = await supabase.from("datas_comemorativas").insert(registros);
  if (error) return { error: error.message };

  revalidatePath("/admin/datas-comemorativas");
  return {
    ok: true,
    count: registros.length,
    erros,
  };
}

export async function deletarDataComemorativaAction(id: string) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  await supabase.from("datas_comemorativas").delete().eq("id", id);
  revalidatePath("/admin/datas-comemorativas");
}

// ============================================================================
// RELATÓRIOS
// ============================================================================
const relatorioSchema = z.object({
  cliente_id: z.string().uuid(),
  mes_referencia: z.string(),
  plataforma: z.enum(["instagram", "facebook", "tiktok", "linkedin", "youtube", "twitter"]),
  seguidores_inicio: z.coerce.number().int().min(0).default(0),
  seguidores_fim: z.coerce.number().int().min(0).default(0),
  seguindo: z.coerce.number().int().min(0).default(0),
  alcance_total: z.coerce.number().int().min(0).default(0),
  impressoes: z.coerce.number().int().min(0).default(0),
  total_posts: z.coerce.number().int().min(0).default(0),
  total_reels: z.coerce.number().int().min(0).default(0),
  total_stories: z.coerce.number().int().min(0).default(0),
  total_curtidas: z.coerce.number().int().min(0).default(0),
  comentarios: z.coerce.number().int().min(0).default(0),
  cliques_link: z.coerce.number().int().min(0).default(0),
  mensagens: z.coerce.number().int().min(0).default(0),
  posts_feitos: z.coerce.number().int().min(0).default(0),
  leads_validados: z.coerce.number().int().min(0).default(0),
  investimento_ads: z.coerce.number().min(0).default(0),
  receita_gerada: z.coerce.number().min(0).default(0),
  observacoes: z.string().optional().nullable(),
});

export async function criarRelatorioAction(formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const raw = Object.fromEntries(formData);
  const parsed = relatorioSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[criarRelatorioAction] validation error:", parsed.error.issues);
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Upsert pelo (cliente_id, mes_referencia, plataforma): se já existir um
  // relatório para o mesmo mês/plataforma, atualiza em vez de falhar com unique
  // violation (uniq_relatorio_cliente_mes_plat). Assim o mesmo formulário serve
  // para criar e editar.
  const { error } = await supabase
    .from("relatorios")
    .upsert(
      { ...parsed.data, agencia_id: session.profile.agencia_id },
      { onConflict: "cliente_id,mes_referencia,plataforma" }
    );
  if (error) {
    console.error("[criarRelatorioAction] supabase error:", error);
    return { error: `Erro ao salvar relatório: ${error.message} (${error.code ?? "sem code"})` };
  }
  revalidatePath("/admin/relatorios");
  revalidatePath(`/admin/clientes/${parsed.data.cliente_id}`);
  return { ok: true };
}

export async function atualizarRelatorioAction(relatorioId: string, formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  // Valida posse antes de atualizar.
  const { data: existente } = await supabase
    .from("relatorios")
    .select("id")
    .eq("id", relatorioId)
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();
  if (!existente) return { error: "Relatório não encontrado." };

  const raw = Object.fromEntries(formData);
  const parsed = relatorioSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[atualizarRelatorioAction] validation error:", parsed.error.issues);
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Atualiza pelo id (não upsert, pra não criar duplicata se mudar mês/plataforma).
  const { error } = await supabase
    .from("relatorios")
    .update({ ...parsed.data, agencia_id: session.profile.agencia_id })
    .eq("id", relatorioId)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) {
    console.error("[atualizarRelatorioAction] supabase error:", error);
    return { error: `Erro ao atualizar relatório: ${error.message} (${error.code ?? "sem code"})` };
  }
  revalidatePath("/admin/relatorios");
  revalidatePath(`/admin/clientes/${parsed.data.cliente_id}`);
  return { ok: true };
}

export async function deletarRelatorioAction(relatorioId: string) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { data: rel } = await supabase
    .from("relatorios")
    .select("cliente_id")
    .eq("id", relatorioId)
    .eq("agencia_id", session.profile.agencia_id!)
    .single();
  const { error } = await supabase
    .from("relatorios")
    .delete()
    .eq("id", relatorioId)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: "Erro ao deletar relatório." };
  if (rel?.cliente_id) revalidatePath(`/admin/clientes/${rel.cliente_id}`);
  revalidatePath("/admin/relatorios");
  return { ok: true };
}

// ============================================================================
// PLANEJAMENTO
// ============================================================================
export async function criarPlanejamentoAction(formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const cliente_id = String(formData.get("cliente_id") ?? "");
  const mes_referencia = String(formData.get("mes_referencia") ?? "");
  if (!cliente_id || !mes_referencia) return { error: "Dados incompletos." };
  const { error } = await supabase.from("planejamentos").insert({
    cliente_id,
    agencia_id: session.profile.agencia_id,
    mes_referencia,
    status: "rascunho",
  });
  if (error) return { error: "Erro." };
  revalidatePath(`/admin/clientes/${cliente_id}`);
  return { ok: true };
}

const planejamentoUpdateSchema = z.object({
  objetivo_geral: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  status: z.enum(["rascunho", "aprovado", "em_execucao", "concluido"]).optional(),
});

/**
 * Atualiza o cabeçalho do planejamento (objetivo geral, observações, status).
 * As ENTRADAS são editadas via atualizarEntradaAction. Há policy de UPDATE
 * (plan_update_agencia, 0010), então o client RLS-bound funciona.
 */
export async function atualizarPlanejamentoAction(id: string, formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  // Posse: o planejamento precisa pertencer à agência do usuário.
  const { data: plan } = await supabase
    .from("planejamentos")
    .select("id, cliente_id")
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();
  if (!plan) return { error: "Planejamento não encontrado." };

  const statusRaw = String(formData.get("status") ?? "");
  const parsed = planejamentoUpdateSchema.safeParse({
    objetivo_geral: String(formData.get("objetivo_geral") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
    ...(statusRaw ? { status: statusRaw } : {}),
  });
  if (!parsed.success) return { error: "Dados inválidos." };

  const update: Record<string, unknown> = {
    objetivo_geral: parsed.data.objetivo_geral?.trim() || null,
    observacoes: parsed.data.observacoes?.trim() || null,
  };
  if (parsed.data.status) update.status = parsed.data.status;

  const { error } = await supabase.from("planejamentos").update(update).eq("id", id);
  if (error) return { error: "Erro ao atualizar planejamento." };
  revalidatePath(`/admin/clientes/${plan.cliente_id}`);
  revalidatePath("/admin/planejamentos");
  return { ok: true };
}

const entradaSchema = z.object({
  planejamento_id: z.string().uuid(),
  data: z.string(),
  tipo: z.enum(["post_feed", "story", "reels", "carrossel", "video", "artigo"]),
  titulo: z.string().min(1),
  descricao: z.string().optional().nullable(),
  copy: z.string().optional().nullable(),
  hashtags: z.array(z.string()).optional().nullable(),
  status: z.enum(["pendente", "aprovado", "publicado", "rejeitado"]).default("pendente"),
  cor: z.string().optional().nullable(),
  estilo: z.string().optional().nullable(),
});

function normalizarCor(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export async function criarEntradaAction(formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const hashtags = String(formData.get("hashtags") ?? "")
    .split(/\s+/)
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));
  const raw = {
    planejamento_id: formData.get("planejamento_id"),
    data: formData.get("data"),
    tipo: formData.get("tipo"),
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao"),
    copy: formData.get("copy"),
    hashtags: hashtags.length ? hashtags : null,
    status: formData.get("status") ?? "pendente",
    cor: normalizarCor(formData.get("cor")),
    estilo: normalizarCor(formData.get("estilo")),
  };
  const parsed = entradaSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { error } = await supabase.from("planejamento_entradas").insert(parsed.data);
  if (error) return { error: "Erro." };
  revalidatePath(`/admin/clientes`);
  return { ok: true };
}

export async function atualizarEntradaAction(entradaId: string, formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const hashtags = String(formData.get("hashtags") ?? "")
    .split(/\s+/)
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));
  const raw = {
    data: formData.get("data"),
    tipo: formData.get("tipo"),
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao"),
    copy: formData.get("copy"),
    hashtags: hashtags.length ? hashtags : null,
    status: formData.get("status") ?? "pendente",
    cor: normalizarCor(formData.get("cor")),
    estilo: normalizarCor(formData.get("estilo")),
  };
  const parsed = entradaSchema.omit({ planejamento_id: true }).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { data: entrada } = await supabase
    .from("planejamento_entradas")
    .select("planejamento_id, planejamentos(cliente_id)")
    .eq("id", entradaId)
    .single();
  const { error } = await supabase
    .from("planejamento_entradas")
    .update(parsed.data)
    .eq("id", entradaId);
  if (error) return { error: "Erro ao atualizar entrada." };
  const clienteId = (entrada?.planejamentos as unknown as { cliente_id?: string } | null)?.cliente_id;
  if (clienteId) revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/clientes`);
  return { ok: true };
}

export async function atualizarEntradaStatusAction(
  entradaId: string,
  status: EntradaStatus,
  comentario?: string
) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { data: entrada } = await supabase
    .from("planejamento_entradas")
    .select("planejamento_id, planejamentos(cliente_id)")
    .eq("id", entradaId)
    .single();
  const update: Record<string, unknown> = {
    status,
    aprovado_por: session.id,
    aprovado_em: new Date().toISOString(),
  };
  // comentário só persiste quando o status indica decisão editorial
  if (
    status === "alteracao_solicitada" ||
    status === "rejeitado" ||
    (status === "aprovado" && comentario && comentario.trim().length > 0)
  ) {
    update.aprovacao_comentario = comentario?.trim() || null;
  }
  await supabase.from("planejamento_entradas").update(update).eq("id", entradaId);
  const clienteId = (entrada?.planejamentos as unknown as { cliente_id?: string } | null)?.cliente_id;
  if (clienteId) revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/clientes`);
  revalidatePath(`/cliente/planejamento`);
}

export async function deletarEntradaAction(entradaId: string) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { data: entrada } = await supabase
    .from("planejamento_entradas")
    .select("planejamento_id, planejamentos(cliente_id)")
    .eq("id", entradaId)
    .single();
  await supabase.from("planejamento_entradas").delete().eq("id", entradaId);
  const clienteId = (entrada?.planejamentos as unknown as { cliente_id?: string } | null)?.cliente_id;
  if (clienteId) revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/clientes`);
}

// ============================================================================
// FINANCEIRO
// ============================================================================
const transacaoSchema = z.object({
  tipo: z.enum(["receita", "despesa"]),
  categoria: z.string().min(1),
  descricao: z.string().min(1),
  valor: z.coerce.number().min(0),
  data_vencimento: z.string(),
  data_pagamento: z.string().optional().nullable(),
  status: z.enum(["pendente", "pago", "atrasado", "cancelado"]).default("pendente"),
  cliente_id: z.string().uuid().optional().nullable(),
  recorrente: z.coerce.boolean().optional(),
});

export async function criarTransacaoAction(prev: unknown, formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const raw = Object.fromEntries(formData);
  const parsed = transacaoSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { error } = await supabase.from("transacoes").insert({
    ...parsed.data,
    agencia_id: session.profile.agencia_id,
  });
  if (error) return { error: "Erro ao criar transação." };
  revalidatePath("/admin/financeiro");
  return { ok: true };
}

export async function atualizarTransacaoAction(id: string, formData: FormData) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const raw = Object.fromEntries(formData);
  const parsed = transacaoSchema.partial().safeParse(raw);
  if (!parsed.success) return { error: "Dados inválidos." };
  const { error } = await supabase
    .from("transacoes")
    .update(parsed.data)
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: "Erro." };
  revalidatePath("/admin/financeiro");
  return { ok: true };
}

export async function deletarTransacaoAction(id: string) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  await supabase
    .from("transacoes")
    .delete()
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  revalidatePath("/admin/financeiro");
}

// ============================================================================
// AGÊNCIA
// ============================================================================
const agenciaSchema = z.object({
  nome: z.string().min(2),
  nome_fantasia: z.string().min(2).optional(),
  razao_social: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  email_contato: z.string().email().optional().nullable().or(z.literal("")),
  site: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  cor_primaria: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
});

export async function atualizarAgenciaAction(id: string, formData: FormData) {
  const session = await requireAgenciaAdmin();
  if (id !== session.profile.agencia_id) return { error: "Sem permissão" };
  const parsed = agenciaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos" };
  // Usa o admin client (service-role, bypassa RLS): NÃO existe policy de
  // UPDATE em public.agencias (0002_rls.sql declara explicitamente "nenhuma
  // policy de INSERT/UPDATE/DELETE"). Com o client RLS-bound o update afeta
  // 0 linhas e o PostgREST retorna error: null — a UI mostra "salvo" mas nada
  // persiste. O check de posse (id === agencia_id) acima já garante segurança.
  const admin = createAdminClient();
  // mapear "nome" do form para "nome_fantasia" no banco
  const { nome, email, ...rest } = parsed.data;
  const { error } = await admin
    .from("agencias")
    .update({ nome_fantasia: nome, email_contato: email ?? null, ...rest })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
  return { ok: true };
}
