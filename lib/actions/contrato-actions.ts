"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgenciaAdmin, requireAgenciaMember, requireCliente } from "@/lib/auth/session";
import { renderTemplate, extractPlaceholders, dataPorExtenso, valorPorExtenso, numeroParaExtenso } from "@/lib/contracts/render";
import { buildContractSignatureHash } from "@/lib/hash";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { emailContrato, sendEmail } from "@/lib/email";
import type { AssinaturaRegistro, Contrato, VariavelContrato } from "@/types/database";
import { headers } from "next/headers";

// ============================================================================
// TEMPLATES
// ============================================================================
const templateSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional().nullable(),
  conteudo: z.string().min(10),
  variaveis: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["string", "number", "date", "currency"]),
      required: z.boolean().optional(),
    })
  ),
  is_global: z.boolean().optional(),
});

export async function criarTemplateAction(formData: FormData) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const raw = {
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    conteudo: formData.get("conteudo"),
    variaveis: JSON.parse(String(formData.get("variaveis") ?? "[]")),
  };
  const parsed = templateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { error } = await supabase.from("contrato_templates").insert({
    agencia_id: session.profile.agencia_id,
    ...parsed.data,
  });
  if (error) return { error: "Erro ao criar template." };
  revalidatePath("/admin/contratos/templates");
  return { ok: true };
}

export async function atualizarTemplateAction(id: string, formData: FormData) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const raw = {
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    conteudo: formData.get("conteudo"),
    variaveis: JSON.parse(String(formData.get("variaveis") ?? "[]")),
  };
  const parsed = templateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { error } = await supabase
    .from("contrato_templates")
    .update(parsed.data)
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id);
  if (error) return { error: "Erro ao atualizar template." };
  revalidatePath("/admin/contratos/templates");
  return { ok: true };
}

export async function deletarTemplateAction(id: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const { error } = await supabase
    .from("contrato_templates")
    .delete()
    .eq("id", id)
    .eq("agencia_id", session.profile.agencia_id);
  if (error) return { error: "Erro ao deletar template." };
  revalidatePath("/admin/contratos/templates");
  return { ok: true };
}

// Duplica um template (global ou da própria agência) para um template próprio da
// agência, que pode então ser editado/excluído livremente. Mantém os globais
// intactos como modelos-base (multi-tenant).
export async function duplicarTemplateAction(id: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  // RLS permite ver globais + templates da própria agência; o .eq("id") basta.
  const { data: original, error: qErr } = await supabase
    .from("contrato_templates")
    .select("nome, descricao, conteudo, variaveis")
    .eq("id", id)
    .maybeSingle();
  if (qErr || !original) return { error: "Template não encontrado." };
  const { error } = await supabase.from("contrato_templates").insert({
    agencia_id: session.profile.agencia_id,
    is_global: false,
    nome: `${original.nome} (cópia)`,
    descricao: original.descricao,
    conteudo: original.conteudo,
    variaveis: original.variaveis,
  });
  if (error) return { error: "Erro ao duplicar template." };
  revalidatePath("/admin/contratos/templates");
  return { ok: true };
}

// ============================================================================
// CONTRATOS
// ============================================================================
const novoContratoSchema = z.object({
  cliente_id: z.string().uuid(),
  template_id: z.string().uuid(),
  titulo: z.string().min(2),
  valor_mensal: z.coerce.number().min(0),
  duracao_meses: z.coerce.number().int().min(1).max(120),
  data_inicio: z.string(),
  dia_vencimento: z.coerce.number().int().min(1).max(31).default(10),
});

export type CriarContratoState =
  | { ok: true; id: string }
  | { error: string }
  | undefined;

export async function criarContratoAction(
  _prev: CriarContratoState,
  formData: FormData
): Promise<CriarContratoState> {
  try {
    const session = await requireAgenciaAdmin();
    const supabase = createClient();

    const raw = {
      cliente_id: formData.get("cliente_id"),
      template_id: formData.get("template_id"),
      titulo: formData.get("titulo"),
      valor_mensal: formData.get("valor_mensal"),
      duracao_meses: formData.get("duracao_meses"),
      data_inicio: formData.get("data_inicio"),
      dia_vencimento: formData.get("dia_vencimento") ?? "10",
    };
    const parsed = novoContratoSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }
    const data = parsed.data;

    // Carrega template + cliente + agencia
    const [{ data: tpl }, { data: cliente }, { data: ag }] = await Promise.all([
      supabase.from("contrato_templates").select("*").eq("id", data.template_id).single(),
      supabase.from("clientes").select("*").eq("id", data.cliente_id).single(),
      supabase.from("agencias").select("*").eq("id", session.profile.agencia_id!).single(),
    ]);
    if (!tpl || !cliente || !ag) {
      return { error: "Template, cliente ou agência inválido." };
    }

    // Calcula data_fim
    const dataFim = new Date(data.data_inicio + "T00:00:00");
    dataFim.setMonth(dataFim.getMonth() + data.duracao_meses);

    // Monta variáveis para substituição
    const valores: Record<string, unknown> = {
      cliente: {
        nome_empresa: cliente.nome_empresa,
        nome_responsavel: cliente.nome_responsavel,
        cnpj_cpf: cliente.cnpj_cpf ?? "—",
        endereco: cliente.endereco ?? "—",
      },
      agencia: {
        nome_fantasia: ag.nome_fantasia,
        cnpj: ag.cnpj ?? "—",
        endereco: ag.endereco ?? "—",
        cidade: ag.endereco?.split(",").pop()?.trim() ?? "—",
      },
      duracao: data.duracao_meses,
      duracao_extenso: numeroParaExtenso(data.duracao_meses),
      data_inicio: data.data_inicio,
      data_fim: dataFim.toISOString().slice(0, 10),
      valor: data.valor_mensal,
      valor_extenso: valorPorExtenso(data.valor_mensal),
      dia_vencimento: data.dia_vencimento,
      data_assinatura: new Date().toISOString().slice(0, 10),
    };

    const conteudo = renderTemplate(
      tpl.conteudo,
      valores,
      (tpl.variaveis as unknown as VariavelContrato[]) ?? []
    );

    const { data: contrato, error } = await supabase
      .from("contratos")
      .insert({
        agencia_id: session.profile.agencia_id!,
        cliente_id: data.cliente_id,
        template_id: data.template_id,
        titulo: data.titulo,
        conteudo,
        valor_mensal: data.valor_mensal,
        duracao_meses: data.duracao_meses,
        data_inicio: data.data_inicio,
        data_fim: dataFim.toISOString().slice(0, 10),
        status: "rascunho",
        variaveis: valores,
      })
      .select("id")
      .single();

    if (error || !contrato) {
      console.error("[criarContratoAction] supabase error:", error);
      return {
        error: `Erro ao criar contrato: ${error?.message ?? "desconhecido"} (${error?.code ?? "sem code"})`,
      };
    }

    revalidatePath("/admin/contratos");
    return { ok: true, id: contrato.id };
  } catch (e) {
    console.error("[criarContratoAction] exception:", e);
    const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return { error: `Erro inesperado: ${detail}` };
  }
}

export async function enviarContratoAction(contratoId: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const { data: contrato, error } = await supabase
    .from("contratos")
    .update({ status: "enviado" })
    .eq("id", contratoId)
    .eq("agencia_id", session.profile.agencia_id!)
    .select("id, titulo, cliente_id")
    .single();
  if (error || !contrato) return { error: "Erro ao enviar contrato." };

  // Notifica o cliente por e-mail (se houver)
  const { data: cliente } = await supabase
    .from("clientes")
    .select("nome_responsavel, email")
    .eq("id", contrato.cliente_id)
    .single();
  if (cliente?.email) {
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/cliente/contratos/${contrato.id}`;
    const tpl = emailContrato({
      clienteNome: cliente.nome_responsavel,
      titulo: contrato.titulo,
      link,
    });
    await sendEmail({ to: cliente.email, subject: tpl.subject, html: tpl.html });
  }

  revalidatePath(`/admin/contratos/${contratoId}`);
  return { ok: true };
}

// ============================================================================
// GERAR LINK DE ASSINATURA (mesmo padrão do convite: token único com validade)
// ============================================================================
export type GerarLinkState =
  | { ok: true; link: string; expiraEm: string; nome: string }
  | { error: string }
  | undefined;

function gerarToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function gerarLinkAssinaturaAction(
  _prev: GerarLinkState,
  formData: FormData
): Promise<GerarLinkState> {
  try {
    const session = await requireAgenciaAdmin();
    const supabase = createClient();
    const contratoId = String(formData.get("contrato_id") ?? "");
    if (!contratoId) return { error: "Contrato inválido." };

    // Garante que o contrato é da agência
    const { data: contrato, error: cErr } = await supabase
      .from("contratos")
      .select("id, titulo, status, cliente_id")
      .eq("id", contratoId)
      .eq("agencia_id", session.profile.agencia_id!)
      .single();
    if (cErr || !contrato) return { error: "Contrato não encontrado." };

    // Pega o nome do cliente (pra personalizar o retorno)
    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome_responsavel, email")
      .eq("id", contrato.cliente_id)
      .single();

    // Gera token novo + expira em 7 dias
    const token = gerarToken();
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: upErr } = await supabase
      .from("contratos")
      .update({
        token_assinatura: token,
        token_expira_em: expiraEm,
        link_gerado_em: new Date().toISOString(),
        status: contrato.status === "rascunho" ? "enviado" : contrato.status,
      })
      .eq("id", contratoId);

    if (upErr) {
      console.error("[gerarLinkAssinaturaAction] supabase error:", upErr);
      return { error: `Erro ao gerar link: ${upErr.message} (${upErr.code ?? "sem code"})` };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://smhub.com.br";
    const link = `${baseUrl}/assinar-contrato?token=${token}`;

    revalidatePath(`/admin/contratos/${contratoId}`);

    return {
      ok: true,
      link,
      expiraEm: new Date(expiraEm).toLocaleDateString("pt-BR"),
      nome: cliente?.nome_responsavel ?? "cliente",
    };
  } catch (e) {
    console.error("[gerarLinkAssinaturaAction] exception:", e);
    const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return { error: `Erro inesperado: ${detail}` };
  }
}

// ============================================================================
// ASSINATURA PÚBLICA (cliente acessa via link/token, sem login)
// ============================================================================
export type AssinarPublicoState =
  | { ok: true }
  | { error: string }
  | undefined;

export async function assinarContratoPublicoAction(
  _prev: AssinarPublicoState,
  formData: FormData
): Promise<AssinarPublicoState> {
  try {
    const admin = createAdminClient();
    const token = String(formData.get("token") ?? "");
    const nome = String(formData.get("nome") ?? "").trim();
    const signatureDataUrl = String(formData.get("signature_data_url") ?? "");

    if (!token) return { error: "Token inválido." };
    if (nome.length < 2) return { error: "Digite seu nome completo." };
    if (!signatureDataUrl.startsWith("data:image/")) {
      return { error: "Assinatura é obrigatória." };
    }

    // Busca contrato pelo token (bypassa RLS, valida manualmente)
    const { data: contrato, error: cErr } = await admin
      .from("contratos")
      .select("id, status, token_expira_em, cliente_id, assinaturas, agencia_id")
      .eq("token_assinatura", token)
      .maybeSingle();

    if (cErr || !contrato) return { error: "Link inválido ou expirado." };
    if (contrato.status === "assinado" || contrato.status === "ativo") {
      return { error: "Este contrato já foi assinado." };
    }
    if (contrato.status === "cancelado" || contrato.status === "encerrado") {
      return { error: "Este contrato não está mais disponível." };
    }
    if (contrato.token_expira_em && new Date(contrato.token_expira_em) < new Date()) {
      return { error: "Este link expirou. Peça um novo link à agência." };
    }

    const h = headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      "0.0.0.0";
    const userAgent = h.get("user-agent") ?? "unknown";
    const data = new Date().toISOString();

    const hash = buildContractSignatureHash({
      contratoId: contrato.id,
      clienteId: contrato.cliente_id,
      ip,
      userAgent,
      data,
    });

    const assinaturasExistentes: AssinaturaRegistro[] = Array.isArray(contrato.assinaturas)
      ? (contrato.assinaturas as unknown as AssinaturaRegistro[])
      : [];

    const novaAssinatura = {
      papel: "cliente",
      data,
      ip,
      user_agent: userAgent,
      hash,
      signature_data_url: signatureDataUrl,
      nome_digitado: nome,
    } as unknown as AssinaturaRegistro;

    const { error: upErr } = await admin
      .from("contratos")
      .update({
        status: "assinado",
        assinaturas: [...assinaturasExistentes, novaAssinatura] as unknown as Record<string, unknown>[],
      })
      .eq("id", contrato.id);

    if (upErr) {
      console.error("[assinarContratoPublicoAction] supabase error:", upErr);
      return { error: `Erro ao registrar assinatura: ${upErr.message}` };
    }

    revalidatePath(`/admin/contratos/${contrato.id}`);
    return { ok: true };
  } catch (e) {
    console.error("[assinarContratoPublicoAction] exception:", e);
    const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return { error: `Erro inesperado: ${detail}` };
  }
}

export async function renovarContratoAction(contratoId: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const { data: original, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", contratoId)
    .eq("agencia_id", session.profile.agencia_id!)
    .single();
  if (error || !original) return { error: "Contrato não encontrado." };

  const dataInicio = new Date();
  const dataFim = new Date(dataInicio);
  dataFim.setMonth(dataFim.getMonth() + (original.duracao_meses ?? 12));

  const valores = (original.variaveis as Record<string, unknown>) ?? {};
  valores.data_inicio = dataInicio.toISOString().slice(0, 10);
  valores.data_fim = dataFim.toISOString().slice(0, 10);
  valores.data_assinatura = new Date().toISOString().slice(0, 10);

  const { data: novo, error: insErr } = await supabase
    .from("contratos")
    .insert({
      agencia_id: original.agencia_id,
      cliente_id: original.cliente_id,
      template_id: original.template_id,
      titulo: `${original.titulo} (Renovação)`,
      conteudo: original.conteudo,
      valor_mensal: original.valor_mensal,
      duracao_meses: original.duracao_meses,
      data_inicio: valores.data_inicio,
      data_fim: valores.data_fim,
      status: "enviado",
      variaveis: valores,
    })
    .select("id")
    .single();
  if (insErr) return { error: "Erro ao renovar." };
  revalidatePath("/admin/contratos");
  redirect(`/admin/contratos/${novo!.id}`);
}

export async function deletarContratoAction(contratoId: string) {
  const session = await requireAgenciaAdmin();
  const supabase = createClient();
  const { error } = await supabase
    .from("contratos")
    .delete()
    .eq("id", contratoId)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: "Erro ao deletar." };
  revalidatePath("/admin/contratos");
  return { ok: true };
}

// ============================================================================
// ASSINATURA (cliente logado)
// ============================================================================
export async function assinarContratoAction(
  contratoId: string,
  signatureDataUrl: string
) {
  const session = await requireCliente();
  const supabase = createClient();

  // Verifica que o contrato é do cliente logado
  const { data: contrato } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", contratoId)
    .eq("cliente_id", session.profile.cliente_id!)
    .single();
  if (!contrato) return { error: "Contrato não encontrado." };
  if (!["enviado", "rascunho"].includes(contrato.status)) {
    return { error: "Este contrato não pode mais ser assinado." };
  }

  const h = headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "0.0.0.0";
  const userAgent = h.get("user-agent") ?? "unknown";
  const data = new Date().toISOString();

  const hash = buildContractSignatureHash({
    contratoId: contrato.id,
    clienteId: contrato.cliente_id,
    ip,
    userAgent,
    data,
  });

  const assinaturas: AssinaturaRegistro[] = Array.isArray(contrato.assinaturas)
    ? (contrato.assinaturas as unknown as AssinaturaRegistro[])
    : [];

  assinaturas.push({
    papel: "cliente",
    data,
    ip,
    user_agent: userAgent,
    hash,
    signature_data_url: signatureDataUrl,
  });

  const { error } = await supabase
    .from("contratos")
    .update({
      status: "assinado",
      assinaturas: assinaturas as unknown as Record<string, unknown>[],
    })
    .eq("id", contratoId);

  if (error) return { error: "Erro ao registrar assinatura." };
  revalidatePath(`/cliente/contratos/${contratoId}`);
  return { ok: true };
}

export async function cancelarContratoAction(contratoId: string) {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const { error } = await supabase
    .from("contratos")
    .update({ status: "cancelado" })
    .eq("id", contratoId)
    .eq("agencia_id", session.profile.agencia_id!);
  if (error) return { error: "Erro ao cancelar." };
  revalidatePath(`/admin/contratos/${contratoId}`);
  return { ok: true };
}

// Helper exportado para uso no editor (placeholders conhecidos)
export { extractPlaceholders, dataPorExtenso };
