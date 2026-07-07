import { NextResponse, type NextRequest } from "next/server";
import { getPayment, verifyWebhookSignature } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailBoasVindasPlataforma, emailPagamentoAprovado } from "@/lib/email";
import type { Plano } from "@/types/database";

/**
 * Webhook do Mercado Pago.
 *
 * MP envia:
 *   { type: "payment" | "plan" | "subscription" | "invoice", data: { id: "123" } }
 *
 * Validamos:
 *   - Assinatura (x-signature + x-request-id)
 *   - Status === "approved" para criar/renovar assinatura
 *   - external_reference: "novo:<email>:<plano>" ou "renovacao:<agencia_id>:<plano>"
 */

// Mantém o handler fora do cache.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateTempPassword(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let senha = "";
  for (let i = 0; i < 10; i++) senha += chars[bytes[i] % chars.length];
  return senha;
}

export async function POST(request: NextRequest) {
  // 1) Validar assinatura
  const sig = request.headers.get("x-signature");
  const reqId = request.headers.get("x-request-id");
  if (!verifyWebhookSignature(sig, reqId)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  // 2) Parse do body
  let body: { type?: string; data?: { id?: string | number } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (body.type !== "payment" || !body.data?.id) {
    // Não é payment: ignora silenciosamente (retorna 200).
    return NextResponse.json({ ok: true, ignored: body.type });
  }

  const paymentId = String(body.data.id);

  // 3) Buscar detalhes do pagamento
  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (err) {
    console.error("[mp webhook] erro getPayment:", err);
    return NextResponse.json({ error: "Falha ao buscar pagamento." }, { status: 500 });
  }

  if (payment.status !== "approved") {
    // Pagamento não aprovado (pending, rejected, etc). Loga e retorna 200.
    console.info(`[mp webhook] payment ${paymentId} status=${payment.status}`);
    return NextResponse.json({ ok: true, ignored: payment.status });
  }

  // 4) Parse external_reference
  const ref = payment.externalReference ?? "";
  const [kind, ...rest] = ref.split(":");
  const admin = createAdminClient();

  // 5) Histórico (sempre grava)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    if (kind === "novo") {
      // Formato: "novo:<email>:<plano>"
      const email = rest[0]?.toLowerCase();
      const plano = (rest[1] as Plano) || "pro";
      if (!email) return NextResponse.json({ ok: true, ignored: "email inválido" });

      await processarNovoPagamento(admin, payment, email, plano, appUrl);
    } else if (kind === "renovacao") {
      // Formato: "renovacao:<agencia_id>:<plano>"
      const agenciaId = rest[0];
      const plano = (rest[1] as Plano) || undefined;
      if (!agenciaId) return NextResponse.json({ ok: true, ignored: "agencia_id inválido" });

      await processarRenovacao(admin, payment, agenciaId, plano);
    } else {
      console.warn(`[mp webhook] external_reference desconhecido: ${ref}`);
    }
  } catch (err) {
    console.error("[mp webhook] erro ao processar:", err);
    return NextResponse.json({ error: "Erro ao processar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ============================================================================
// NOVO PAGAMENTO → cria agência + admin
// ============================================================================

async function processarNovoPagamento(
  admin: ReturnType<typeof createAdminClient>,
  payment: Awaited<ReturnType<typeof getPayment>>,
  email: string,
  plano: Plano,
  appUrl: string
) {
  // Idempotência: se já temos pagamento com esse mp_payment_id, ignora.
  const { data: jaExiste } = await admin
    .from("assinatura_pagamentos")
    .select("id")
    .eq("mp_payment_id", String(payment.id))
    .maybeSingle();
  if (jaExiste) {
    console.info(`[mp webhook] pagamento ${payment.id} já processado.`);
    return;
  }

  // Verifica se já existe usuário com esse email
  const { data: usuarioExistente } = await admin
    .from("usuarios")
    .select("id, user_id, agencia_id, nome")
    .eq("email", email)
    .maybeSingle();

  let userId: string;
  let agenciaId: string;
  let nome: string;
  let nomeAgencia: string;

  if (usuarioExistente && usuarioExistente.agencia_id) {
    // Email já cadastrado e já tem agência: trata como renovação.
    userId = usuarioExistente.user_id;
    agenciaId = usuarioExistente.agencia_id;
    nome = usuarioExistente.nome;
    const { data: ag } = await admin
      .from("agencias")
      .select("nome_fantasia")
      .eq("id", agenciaId)
      .maybeSingle();
    nomeAgencia = ag?.nome_fantasia ?? "Sua Agência";
    return processarRenovacao(admin, payment, agenciaId, plano, {
      nome,
      email,
      userId,
    });
  }

  // 1) Cria auth user com senha temporária
  const senhaTemp = generateTempPassword();
  const { data: signData, error: signErr } = await admin.auth.admin.createUser({
    email,
    password: senhaTemp,
    email_confirm: true,
    user_metadata: { role: "admin_agencia" },
  });
  if (signErr || !signData.user) {
    throw new Error(`Erro ao criar auth user: ${signErr?.message}`);
  }
  userId = signData.user.id;
  nome = payment.payerEmail === email ? "Novo Admin" : email.split("@")[0];
  // Pega nome do payer (do payment metadata — mas MP não envia nome completo aqui;
  // por isso a página de definir-senha vai pedir o nome da agência).
  nomeAgencia = "Minha Agência";

  // 2) Cria agência
  const { data: ag, error: agErr } = await admin
    .from("agencias")
    .insert({
      nome_fantasia: nomeAgencia,
      status: "ativa",
      plano,
      email_contato: email,
    })
    .select("id")
    .single();
  if (agErr || !ag) throw new Error(`Erro ao criar agência: ${agErr?.message}`);
  agenciaId = ag.id;

  // 3) Cria usuario (admin_agencia)
  const { error: userErr } = await admin.from("usuarios").insert({
    user_id: userId,
    agencia_id: agenciaId,
    nome,
    email,
    role: "admin_agencia",
    ativo: true,
  });
  if (userErr) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    await admin.from("agencias").delete().eq("id", agenciaId);
    throw new Error(`Erro ao criar usuario: ${userErr.message}`);
  }

  // 4) Gera signup_token
  const token = generateToken();
  const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: tokErr } = await admin.from("signup_tokens").insert({
    token,
    email,
    nome,
    nome_agencia: nomeAgencia,
    plano,
    user_id: userId,
    agencia_id: agenciaId,
    expira_em: expiraEm,
  });
  if (tokErr) console.error("[mp webhook] erro signup_token:", tokErr.message);

  // 5) Cria assinatura trial/paga (30 dias a partir de agora)
  const periodoFim = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: ass, error: assErr } = await admin
    .from("assinatura_ativa")
    .insert({
      agencia_id: agenciaId,
      plano,
      status: "paga",
      periodo_inicio: new Date().toISOString(),
      periodo_fim: periodoFim,
      valor_pago: payment.transactionAmount,
      mp_payment_id: String(payment.id),
      mp_status_detail: payment.statusDetail,
      is_trial: false,
      grace_period_dias: 5,
    })
    .select("id")
    .single();
  if (assErr) console.error("[mp webhook] erro assinatura_ativa:", assErr.message);

  // 6) Grava histórico de pagamento
  await admin.from("assinatura_pagamentos").insert({
    agencia_id: agenciaId,
    assinatura_id: ass?.id ?? null,
    mp_payment_id: String(payment.id),
    mp_status: payment.status,
    mp_status_detail: payment.statusDetail,
    valor: payment.transactionAmount,
    metodo: payment.paymentTypeId ?? payment.paymentMethodId,
    payload: payment as unknown as Record<string, unknown>,
  });

  // 7) Email com link para definir senha + ativar conta
  const linkAtivar = `${appUrl}/ativar?token=${token}`;
  await sendEmail({
    to: email,
    ...emailBoasVindasPlataforma({ nome, nomeAgencia, link: linkAtivar }),
  });
}

// ============================================================================
// RENOVAÇÃO
// ============================================================================

async function processarRenovacao(
  admin: ReturnType<typeof createAdminClient>,
  payment: Awaited<ReturnType<typeof getPayment>>,
  agenciaId: string,
  plano: Plano | undefined,
  ctx?: { nome?: string; email?: string; userId?: string }
) {
  // Idempotência
  const { data: jaExiste } = await admin
    .from("assinatura_pagamentos")
    .select("id")
    .eq("mp_payment_id", String(payment.id))
    .maybeSingle();
  if (jaExiste) {
    console.info(`[mp webhook] pagamento ${payment.id} já processado.`);
    return;
  }

  // Busca agência
  const { data: ag } = await admin
    .from("agencias")
    .select("id, status, plano")
    .eq("id", agenciaId)
    .maybeSingle();
  if (!ag) {
    console.warn(`[mp webhook] agência ${agenciaId} não encontrada.`);
    return;
  }

  // Calcula nova vigência: max(periodo_fim atual, now) + 30d
  const { data: ultima } = await admin
    .from("assinatura_ativa")
    .select("id, periodo_fim, status")
    .eq("agencia_id", agenciaId)
    .order("periodo_fim", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseMs = ultima
    ? Math.max(new Date(ultima.periodo_fim).getTime(), Date.now())
    : Date.now();
  const novoFim = new Date(baseMs + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Cancela assinatura anterior
  if (ultima && ultima.id) {
    await admin
      .from("assinatura_ativa")
      .update({ status: "cancelada" })
      .eq("id", ultima.id);
  }

  // Plano final (se não veio, mantém o atual da agência)
  const novoPlano: Plano = plano ?? (ag.plano as Plano) ?? "pro";

  // Cria nova
  const { data: ass } = await admin
    .from("assinatura_ativa")
    .insert({
      agencia_id: agenciaId,
      plano: novoPlano,
      status: "paga",
      periodo_inicio: new Date().toISOString(),
      periodo_fim: novoFim,
      valor_pago: payment.transactionAmount,
      mp_payment_id: String(payment.id),
      mp_status_detail: payment.statusDetail,
      is_trial: false,
      grace_period_dias: 5,
    })
    .select("id")
    .single();

  // Atualiza agencia
  await admin
    .from("agencias")
    .update({ status: "ativa", plano: novoPlano })
    .eq("id", agenciaId);

  // Histórico
  await admin.from("assinatura_pagamentos").insert({
    agencia_id: agenciaId,
    assinatura_id: ass?.id ?? null,
    mp_payment_id: String(payment.id),
    mp_status: payment.status,
    mp_status_detail: payment.statusDetail,
    valor: payment.transactionAmount,
    metodo: payment.paymentTypeId ?? payment.paymentMethodId,
    payload: payment as unknown as Record<string, unknown>,
  });

  // Email de confirmação
  let nomeUsuario = ctx?.nome;
  let emailUsuario = ctx?.email;
  if (!emailUsuario) {
    const { data: u } = await admin
      .from("usuarios")
      .select("nome, email")
      .eq("agencia_id", agenciaId)
      .eq("role", "admin_agencia")
      .limit(1)
      .maybeSingle();
    nomeUsuario = u?.nome ?? "Admin";
    emailUsuario = u?.email ?? null;
  }
  if (emailUsuario) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await sendEmail({
      to: emailUsuario,
      ...emailPagamentoAprovado({
        nome: nomeUsuario ?? "Admin",
        valor: payment.transactionAmount,
        link: `${appUrl}/admin`,
      }),
    });
  }
}
