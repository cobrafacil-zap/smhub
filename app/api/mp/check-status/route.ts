import { NextResponse, type NextRequest } from "next/server";
import { getPayment } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/mp/check-status?payment_id=123
 *
 * Usado pelo polling da página /checkout/sucesso.
 * Retorna o status do pagamento e se já existe uma assinatura criada.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("payment_id");

  if (!paymentId) {
    return NextResponse.json({ error: "payment_id ausente." }, { status: 400 });
  }

  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao buscar pagamento." },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  // Verifica se já existe assinatura vinculada a esse pagamento
  let assinaturaCriada = false;
  let agenciaId: string | null = null;
  let email: string | null = null;
  let signupToken: string | null = null;

  if (payment.status === "approved") {
    const { data: pag } = await admin
      .from("assinatura_pagamentos")
      .select("agencia_id")
      .eq("mp_payment_id", String(payment.id))
      .maybeSingle();
    if (pag) {
      assinaturaCriada = true;
      agenciaId = pag.agencia_id;

      const { data: ag } = await admin
        .from("agencias")
        .select("email_contato")
        .eq("id", agenciaId)
        .maybeSingle();
      email = ag?.email_contato ?? payment.payerEmail;

      // Se foi "novo", retorna o token para a página redirecionar para /ativar
      if (payment.externalReference?.startsWith("novo:")) {
        const { data: tok } = await admin
          .from("signup_tokens")
          .select("token")
          .eq("agencia_id", agenciaId)
          .is("usado_em", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        signupToken = tok?.token ?? null;
      }
    }
  }

  return NextResponse.json({
    payment_status: payment.status,
    payment_status_detail: payment.statusDetail,
    external_reference: payment.externalReference,
    transaction_amount: payment.transactionAmount,
    assinatura_criada: assinaturaCriada,
    agencia_id: agenciaId,
    email,
    signup_token: signupToken,
  });
}
