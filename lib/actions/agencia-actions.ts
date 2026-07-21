"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgenciaAdmin, requireAgenciaMember } from "@/lib/auth/session";
import { CLIENTE_SEGMENTOS, ENTRY_TIPO_LABEL } from "@/lib/constants";
import { prazoDaEntrada } from "@/lib/planejamento";
import { formatDate } from "@/lib/utils";
import type { Cliente, EntradaStatus, PlanejamentoEntrada, Usuario } from "@/types/database";

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
  supervisor_id: z.string().uuid().optional().nullable(),
});

export type CriarEquipeState =
  | { error?: string; ok?: true; link?: string; nome?: string; email?: string; expiraEm?: string }
  | undefined;

/**
 * Sobe a cadeia de supervisores a partir de `supervisorId` e devolve true se
 * encontrar `memberId` (=> formaria ciclo). Limita a 50 níveis por segurança.
 */
async function formaCiclo(
  admin: ReturnType<typeof createAdminClient>,
  supervisorId: string,
  memberId: string
): Promise<boolean> {
  let atual: string | null = supervisorId;
  for (let i = 0; i < 50 && atual; i++) {
    if (atual === memberId) return true;
    const { data }: { data: { supervisor_id: string | null } | null } = await admin
      .from("usuarios")
      .select("supervisor_id")
      .eq("id", atual as string)
      .maybeSingle();
    atual = (data as { supervisor_id: string | null } | null)?.supervisor_id ?? null;
  }
  return false;
}

// CONVIDAR MEMBRO POR LINK (modelo convidarClienteAction)
// Cria o usuário no Auth com senha aleatória, registra em usuarios, gera um
// token em convites e devolve o link /definir-senha?token=... pro admin enviar.
export async function criarEquipeAction(
  _prev: CriarEquipeState,
  formData: FormData
): Promise<CriarEquipeState> {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;
  const admin = createAdminClient();

  const raw = Object.fromEntries(formData) as Record<string, unknown>;
  // supervisor_id vazio ("") => null
  if (raw.supervisor_id === "") raw.supervisor_id = null;
  const parsed = equipeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Valida ciclo de supervisor (caso o admin já tenha vinculado antes)
  if (parsed.data.supervisor_id) {
    const ciclo = await formaCiclo(admin, parsed.data.supervisor_id, parsed.data.supervisor_id);
    if (ciclo) return { error: "Supervisor inválido (ciclo na hierarquia)." };
  }

  // 1) Cria usuário no Auth (senha aleatória; o membro define a própria via link)
  const senhaTemp = crypto.randomUUID() + Math.random().toString(36);
  const { data: signData, error: signErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: senhaTemp,
    email_confirm: true,
    user_metadata: { nome: parsed.data.nome, role: parsed.data.role },
  });
  if (signErr || !signData.user) {
    return { error: signErr?.message ?? "Erro ao criar usuário no Auth." };
  }
  const userId = signData.user.id;

  // 2) Registra em usuarios
  const { error: userErr } = await admin.from("usuarios").insert({
    user_id: userId,
    agencia_id: aid,
    nome: parsed.data.nome,
    email: parsed.data.email,
    cargo: parsed.data.cargo ?? null,
    telefone: parsed.data.telefone ?? null,
    custo_mensal: parsed.data.custo_mensal ?? 0,
    role: parsed.data.role,
    supervisor_id: parsed.data.supervisor_id ?? null,
    ativo: true,
  });
  if (userErr) {
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      /* ignora */
    }
    return { error: `Erro ao criar membro: ${userErr.message}` };
  }

  // 3) Gera token de convite (válido por 7 dias)
  const tokenBytes = new Uint8Array(24);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: convErr } = await admin.from("convites").insert({
    token,
    cliente_id: null,
    agencia_id: aid,
    email: parsed.data.email,
    role: parsed.data.role,
    user_id: userId,
    expira_em: expiraEm,
  });
  if (convErr) {
    // A tarefa principal (criar o membro) deu certo; só logamos o problema do link.
    console.error("[criarEquipeAction] erro ao gerar convite:", convErr);
  }

  revalidatePath("/admin/equipe");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://smhub.com.br";
  const link = `${baseUrl}/definir-senha?token=${token}`;
  return {
    ok: true,
    nome: parsed.data.nome,
    email: parsed.data.email,
    link,
    expiraEm: new Date(expiraEm).toLocaleDateString("pt-BR"),
  };
}

// RENVIAR / GERAR LINK DE ACESSO para um membro já existente.
// Invalida os convites anteriores não-usados desse usuário (para não ficarem
// links válidos soltos) e gera um novo token em `convites` (válido por 7 dias).
// Funciona tanto para o primeiro acesso (membro ainda não definiu senha) quanto
// como redefinição de senha (membro já ativo).
export async function reenviarConviteEquipeAction(
  membroId: string
): Promise<
  | { error: string }
  | { ok: true; link: string; expiraEm: string; nome: string; email: string }
> {
  const session = await requireAgenciaAdmin();
  const aid = session.profile.agencia_id!;
  const admin = createAdminClient();

  // 1) Localiza o membro e valida escopo (mesma agência, não é cliente).
  const { data: membro, error: lookupErr } = await admin
    .from("usuarios")
    .select("id, user_id, nome, email, role, agencia_id")
    .eq("id", membroId)
    .maybeSingle();
  if (lookupErr || !membro) return { error: "Membro não encontrado." };
  if (membro.agencia_id !== aid) return { error: "Sem permissão para este membro." };
  if (membro.role === "cliente") return { error: "Use o convite de cliente na área de Clientes." };
  if (!membro.user_id) return { error: "Este membro não possui usuário de acesso." };

  const userId = membro.user_id;

  // 2) Invalida convites anteriores não-usados desse usuário (não ficam válidos).
  await admin
    .from("convites")
    .update({ usado_em: new Date().toISOString() })
    .eq("user_id", userId)
    .is("usado_em", null);

  // 3) Gera novo token (válido por 7 dias).
  const tokenBytes = new Uint8Array(24);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: convErr } = await admin.from("convites").insert({
    token,
    cliente_id: null,
    agencia_id: aid,
    email: membro.email,
    role: membro.role,
    user_id: userId,
    expira_em: expiraEm,
  });
  if (convErr) {
    console.error("[reenviarConviteEquipeAction] erro ao gerar convite:", convErr);
    return { error: "Erro ao gerar o link de acesso." };
  }

  revalidatePath("/admin/equipe");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://smhub.com.br";
  const link = `${baseUrl}/definir-senha?token=${token}`;
  return {
    ok: true,
    link,
    expiraEm: new Date(expiraEm).toLocaleDateString("pt-BR"),
    nome: membro.nome ?? membro.email ?? "membro",
    email: membro.email ?? "",
  };
}

export async function atualizarEquipeAction(id: string, formData: FormData) {
  const session = await requireAgenciaAdmin();
  const admin = createAdminClient();
  const aid = session.profile.agencia_id!;

  const raw = Object.fromEntries(formData) as Record<string, unknown>;
  if (raw.supervisor_id === "") raw.supervisor_id = null;
  const parsed = equipeSchema.omit({ email: true }).partial().safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Valida ciclo de supervisor: o supervisor escolhido não pode ter `id` na
  // sua cadeia de supervisores (senão `id` viraria supervisor de si mesmo).
  const novoSup = parsed.data.supervisor_id ?? null;
  if (novoSup) {
    const ciclo = await formaCiclo(admin, novoSup, id);
    if (ciclo) {
      return { error: "Esse supervisor criaria um ciclo na hierarquia. Escolha outro." };
    }
  }

  const custoMensal = raw.custo_mensal
    ? Number(String(raw.custo_mensal).replace(",", "."))
    : 0;
  const { error } = await admin
    .from("usuarios")
    .update({
      nome: parsed.data.nome,
      cargo: parsed.data.cargo ?? null,
      telefone: parsed.data.telefone ?? null,
      role: parsed.data.role,
      supervisor_id: novoSup,
      custo_mensal: isFinite(custoMensal) && custoMensal >= 0 ? custoMensal : 0,
    })
    .eq("id", id)
    .eq("agencia_id", aid);
  if (error) return { error: "Erro." };

  // O perfil pode ter mudado de role — invalida o cache de sessão.
  revalidateTag("session-profile");
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

/**
 * Atualiza apenas os "dias de postagem" do planejamento (seleção de dias da
 * semana que o admin marca no calendário). `dias` é um array de inteiros
 * 0..6 (getDay: 0=Dom..6=Sáb). Vazio/null remove a marcação.
 */
export async function atualizarDiasPostagemAction(id: string, dias: number[]) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { data: plan } = await supabase
    .from("planejamentos")
    .select("id, cliente_id")
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!)
    .maybeSingle();
  if (!plan) return { error: "Planejamento não encontrado." };

  // Sanitiza: inteiros 0..6 únicos.
  const unicos = Array.from(
    new Set((dias ?? []).map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))
  ).sort((a, b) => a - b);

  const { error } = await supabase
    .from("planejamentos")
    .update({ dias_postagem: unicos.length > 0 ? unicos : null })
    .eq("id", id);
  if (error) return { error: "Erro ao salvar dias de postagem." };
  revalidatePath(`/admin/clientes/${plan.cliente_id}`);
  return { ok: true, dias_postagem: unicos.length > 0 ? unicos : null };
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
  responsavel_id: z.string().uuid().nullable().optional(),
});

function normalizarCor(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

// ---------------------------------------------------------------------------
// Sincroniza a tarefa automática de uma entrada do planejamento.
//
// Ao atribuir um responsável (designer) a um post, cria (ou atualiza) uma
// tarefa no quadro do time — sempre a MESMA tarefa por entrada (link via
// tarefas.entrada_id). Regra de prazo em lib/planejamento.ts.
//
// - Só admins criam/sincronizam tarefas (membros apenas recebem).
// - Se responsavelId for null/empty, remove a tarefa vinculada (se houver).
// - Retorna uma string de erro se algo falhar (a entrada já foi persistida;
//   o erro é repassado à UI como toast, sem abortar o salvamento da entrada).
// ---------------------------------------------------------------------------
async function sincronizarTarefaDaEntrada(
  supabase: ReturnType<typeof createClient>,
  session: { profile: { id: string; role: string; agencia_id: string | null } },
  entrada: { id: string; data: string; titulo: string; tipo: string },
  responsavelId: string | null,
  clienteId: string | null
): Promise<string | null> {
  const aid = session.profile.agencia_id;
  if (!aid) return null;
  // Só admin cria tarefas. Membros podem atribuir o campo, mas a tarefa só
  // nasce quando um admin faz a atribuição.
  if (session.profile.role !== "admin_agencia") return null;

  // Tarefa existente vinculada a esta entrada (1:1).
  const { data: existente } = await supabase
    .from("tarefas")
    .select("id")
    .eq("entrada_id", entrada.id)
    .maybeSingle();

  // Sem responsável -> remove a tarefa automática (e seus responsáveis).
  if (!responsavelId) {
    if (existente?.id) {
      await supabase.from("tarefa_responsaveis").delete().eq("tarefa_id", existente.id);
      await supabase.from("tarefas").delete().eq("id", existente.id).eq("agencia_id", aid);
    }
    return null;
  }

  // Dia de entrega configurado pela agência (0=Dom..6=Sáb, padrão 5=Sexta).
  const admin = createAdminClient();
  const { data: ag } = await admin
    .from("agencias")
    .select("prazo_entrega_dia_semana")
    .eq("id", aid)
    .maybeSingle();
  const diaEntrega = ag?.prazo_entrega_dia_semana ?? 5;

  const { prazo, urgente } = prazoDaEntrada(entrada.data, diaEntrega);
  const prioridade = urgente ? "urgente" : "media";
  const titulo = `Post: ${entrada.titulo || "Peça do planejamento"}`;
  const tipoLabel = ENTRY_TIPO_LABEL[entrada.tipo] ?? entrada.tipo;
  const descricao = `Peça do planejamento editorial (${tipoLabel}) programada para ${formatDate(entrada.data)}.`;

  if (existente?.id) {
    // Atualiza a mesma tarefa (não toca no status — membro pode já ter movido).
    const { error: upErr } = await supabase
      .from("tarefas")
      .update({ titulo, descricao, prazo, prioridade, cliente_id: clienteId })
      .eq("id", existente.id)
      .eq("agencia_id", aid);
    if (upErr) return upErr.message;
    // Sincroniza responsáveis: troca pelo designer atribuído.
    await supabase.from("tarefa_responsaveis").delete().eq("tarefa_id", existente.id);
    const { error: respErr } = await supabase
      .from("tarefa_responsaveis")
      .insert({ tarefa_id: existente.id, usuario_id: responsavelId });
    if (respErr) return respErr.message;
    return null;
  }

  // Cria nova tarefa vinculada à entrada.
  const { data: tarefa, error: insErr } = await supabase
    .from("tarefas")
    .insert({
      agencia_id: aid,
      cliente_id: clienteId,
      criado_por: session.profile.id,
      titulo,
      descricao,
      status: "destinada",
      prioridade,
      prazo,
      entrada_id: entrada.id,
    })
    .select("id")
    .single();
  if (insErr || !tarefa) return insErr?.message ?? "Erro ao criar tarefa.";
  const { error: respErr } = await supabase
    .from("tarefa_responsaveis")
    .insert({ tarefa_id: tarefa.id, usuario_id: responsavelId });
  if (respErr) return respErr.message;
  return null;
}

// ---------------------------------------------------------------------------
// Atribui TODAS as entradas de um planejamento a um único responsável de uma vez
// (e sincroniza a tarefa automática de cada uma). Útil pra não marcar post a
// post. responsavelId vazio = limpa todos.
// ---------------------------------------------------------------------------
export async function atribuirTodasEntradasAction(planejamentoId: string, responsavelId: string) {
  const session = await requireAgenciaMember();
  if (session.profile.role !== "admin_agencia") {
    return { error: "Apenas administradores podem atribuir em lote." };
  }
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  // Valida o responsável (se informado) como membro da agência.
  if (responsavelId) {
    const { data: respUser } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", responsavelId)
      .eq("agencia_id", aid)
      .maybeSingle();
    if (!respUser) return { error: "Responsável inválido." };
  }

  // Valida posse do planejamento (via agência do cliente) e pega o cliente.
  const { data: planOk } = await supabase
    .from("planejamentos")
    .select("id, cliente_id, clientes!inner(agencia_id)")
    .eq("id", planejamentoId)
    .maybeSingle();
  const cliAid = (planOk?.clientes as unknown as { agencia_id?: string } | null)?.agencia_id;
  if (!planOk || cliAid !== aid) return { error: "Planejamento inválido." };
  const clienteId = planOk.cliente_id ?? null;

  // Carrega as entradas do planejamento.
  const { data: entradas } = await supabase
    .from("planejamento_entradas")
    .select("id, data, titulo, tipo")
    .eq("planejamento_id", planejamentoId)
    .order("data");
  const lista = (entradas ?? []) as { id: string; data: string; titulo: string; tipo: string }[];
  if (lista.length === 0) return { error: "Nenhuma entrada para atribuir." };

  // Atualiza responsavel_id de todas de uma vez.
  const { error: upErr } = await supabase
    .from("planejamento_entradas")
    .update({ responsavel_id: responsavelId || null })
    .eq("planejamento_id", planejamentoId);
  if (upErr) return { error: "Erro ao atribuir: " + upErr.message };

  // Sincroniza a tarefa de cada entrada (cria/atualiza/remove conforme o caso).
  const rid = responsavelId || null;
  let erros = 0;
  for (const e of lista) {
    const err = await sincronizarTarefaDaEntrada(supabase, session, e, rid, clienteId);
    if (err) erros++;
  }

  if (clienteId) revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/clientes`);
  revalidatePath(`/admin/tarefas`);
  revalidatePath(`/admin`);
  return { ok: true, total: lista.length, erros };
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
    estilo: normalizarCor(formData.get("estilo")),
    responsavel_id: formData.get("responsavel_id") || null,
  };
  const parsed = entradaSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  // Valida que o responsável (se informado) é membro da mesma agência.
  if (parsed.data.responsavel_id) {
    const { data: respUser } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", parsed.data.responsavel_id)
      .eq("agencia_id", session.profile.agencia_id!)
      .maybeSingle();
    if (!respUser) return { error: "Responsável inválido." };
  }
  // cor não vem mais do cliente (cor é fixa por tipo); garante null p/ não gravar lixo.
  const { data: entrada, error } = await supabase
    .from("planejamento_entradas")
    .insert({ ...parsed.data, cor: null })
    .select("*")
    .single();
  if (error) return { error: "Erro." };

  // Sincroniza a tarefa automática (quadro do time) para o responsável atribuído.
  let tarefaErro: string | null = null;
  if (entrada) {
    const { data: plan } = await supabase
      .from("planejamentos")
      .select("cliente_id")
      .eq("id", String(formData.get("planejamento_id")))
      .maybeSingle();
    tarefaErro = await sincronizarTarefaDaEntrada(
      supabase,
      session,
      entrada as PlanejamentoEntrada,
      (parsed.data.responsavel_id as string | null) ?? null,
      plan?.cliente_id ?? null
    );
  }

  revalidatePath(`/admin/clientes`);
  revalidatePath(`/admin/tarefas`);
  revalidatePath(`/admin`);
  return { ok: true, entrada: entrada as PlanejamentoEntrada, tarefaErro: tarefaErro ?? undefined };
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
    estilo: normalizarCor(formData.get("estilo")),
    responsavel_id: formData.get("responsavel_id") || null,
  };
  const parsed = entradaSchema.omit({ planejamento_id: true }).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  // Valida que o responsável (se informado) é membro da mesma agência.
  if (parsed.data.responsavel_id) {
    const { data: respUser } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", parsed.data.responsavel_id)
      .eq("agencia_id", session.profile.agencia_id!)
      .maybeSingle();
    if (!respUser) return { error: "Responsável inválido." };
  }
  const { data: entradaAntiga } = await supabase
    .from("planejamento_entradas")
    .select("planejamento_id, planejamentos(cliente_id)")
    .eq("id", entradaId)
    .single();
  const { data: entrada, error } = await supabase
    .from("planejamento_entradas")
    .update({ ...parsed.data, cor: null })
    .eq("id", entradaId)
    .select("*")
    .single();
  if (error) return { error: "Erro ao atualizar entrada." };
  const clienteId = (entradaAntiga?.planejamentos as unknown as { cliente_id?: string } | null)?.cliente_id;

  // Sincroniza a tarefa automática (quadro do time) para o responsável atribuído.
  let tarefaErro: string | null = null;
  if (entrada) {
    tarefaErro = await sincronizarTarefaDaEntrada(
      supabase,
      session,
      entrada as PlanejamentoEntrada,
      (parsed.data.responsavel_id as string | null) ?? null,
      clienteId ?? null
    );
  }

  if (clienteId) revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/clientes`);
  revalidatePath(`/admin/tarefas`);
  revalidatePath(`/admin`);
  return { ok: true, entrada: entrada as PlanejamentoEntrada, tarefaErro: tarefaErro ?? undefined };
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
  return { ok: true, entradaId, status, comentario: comentario?.trim() || null };
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
  natureza: z.enum(["fixa", "variavel"]).default("variavel"),
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
  revalidateTag("financeiro-data");
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
  revalidateTag("financeiro-data");
  return { ok: true };
}

export async function deletarTransacaoAction(id: string) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { error } = await supabase
    .from("transacoes")
    .delete()
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: "Erro ao excluir lançamento." };
  revalidatePath("/admin/financeiro");
  revalidateTag("financeiro-data");
  return { ok: true };
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
  // Dia da semana de entrega das peças da semana seguinte (0=Dom..6=Sáb).
  prazo_entrega_dia_semana: z.coerce.number().int().min(0).max(6).optional(),
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
