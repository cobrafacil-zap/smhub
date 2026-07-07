import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Wrapper do SDK do Mercado Pago (Checkout Pro).
 *
 * Variáveis de ambiente:
 *  - MP_ACCESS_TOKEN      → token privado do MP (sandbox ou produção)
 *  - MP_PUBLIC_KEY        → public key (server-side, para Preference)
 *  - MP_WEBHOOK_SECRET    → segredo para validar assinatura do webhook
 *  - NEXT_PUBLIC_APP_URL  → URL pública do app (usada em back_urls e notification_url)
 *
 * SDK v3: importamos `MercadoPagoConfig`, `Preference` e `Payment` de "mercadopago".
 */

let _client: MercadoPagoConfig | null = null;

function getClient(): MercadoPagoConfig {
  if (_client) return _client;
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN não configurado.");
  }
  _client = new MercadoPagoConfig({ accessToken });
  return _client;
}

export type PlanoId = "basico" | "pro" | "enterprise";

export interface CreatePreferenceInput {
  /** Plano sendo contratado. */
  plano: PlanoId;
  /** Valor em reais (ex.: 299.00). */
  valor: number;
  /** Título do item exibido no checkout. */
  titulo: string;
  /** Email do pagador (pode ser o email do admin ou um email temporário). */
  payerEmail: string;
  /** Nome do pagador. */
  payerName?: string;
  /** Identificador externo:
   *    - "novo:<email>"     → novo cadastro, sem agencia_id
   *    - "renovacao:<agencia_id>" → agência existente renovando
   */
  externalRef: string;
  /** Metadata extra para rastreio. */
  metadata?: Record<string, unknown>;
}

export interface CreatePreferenceResult {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export async function createPreference(
  input: CreatePreferenceInput
): Promise<CreatePreferenceResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const pref = new Preference(getClient());

  const result = await pref.create({
    body: {
      items: [
        {
          id: `plano-${input.plano}`,
          title: input.titulo,
          description: `Assinatura mensal do plano ${input.plano} — SM Hub`,
          quantity: 1,
          unit_price: Number(input.valor.toFixed(2)),
          currency_id: "BRL",
        },
      ],
      payer: {
        email: input.payerEmail,
        name: input.payerName,
      },
      back_urls: {
        success: `${appUrl}/checkout/sucesso`,
        failure: `${appUrl}/checkout/falha`,
        pending: `${appUrl}/checkout/pendente`,
      },
      auto_return: "approved",
      external_reference: input.externalRef,
      notification_url: `${appUrl}/api/mp/webhook`,
      statement_descriptor: "SM HUB",
      metadata: input.metadata ?? {},
    },
  });

  return {
    preferenceId: result.id ?? "",
    initPoint: result.init_point ?? "",
    sandboxInitPoint: result.sandbox_init_point ?? "",
  };
}

export interface PaymentInfo {
  id: number;
  status: string;
  statusDetail: string | null;
  transactionAmount: number;
  paymentMethodId: string | null;
  paymentTypeId: string | null;
  externalReference: string | null;
  payerEmail: string | null;
  dateApproved: string | null;
}

export async function getPayment(paymentId: string | number): Promise<PaymentInfo> {
  const payment = new Payment(getClient());
  const r = await payment.get({ id: String(paymentId) });
  return {
    id: typeof r.id === "number" ? r.id : Number(r.id),
    status: r.status ?? "unknown",
    statusDetail: r.status_detail ?? null,
    transactionAmount: Number(r.transaction_amount ?? 0),
    paymentMethodId: r.payment_method_id ?? null,
    paymentTypeId: r.payment_type_id ?? null,
    externalReference: r.external_reference ?? null,
    payerEmail: r.payer?.email ?? null,
    dateApproved: r.date_approved ?? null,
  };
}

/**
 * Valida a assinatura do webhook do Mercado Pago.
 * O MP envia headers:
 *   - x-signature:  "ts=1234567890,v1=abcdef..."
 *   - x-request-id: "uuid-..."
 *
 * O cálculo é: HMAC-SHA256( `id:<x-request-id>;ts:<ts>`, MP_WEBHOOK_SECRET )
 * e comparamos com `v1` recebido.
 *
 * Retorna true se válido ou se não houver secret configurado (modo dev).
 */
export function verifyWebhookSignature(
  signatureHeader: string | null,
  requestIdHeader: string | null
): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Em dev/teste sem secret, aceita (mas logamos).
    console.warn("[MP] MP_WEBHOOK_SECRET não configurado — webhook aceito sem validação.");
    return true;
  }
  if (!signatureHeader || !requestIdHeader) return false;

  // Parse "ts=...,v1=..."
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""];
    })
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${requestIdHeader};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/** Limites de clientes por status. Trial é limitado a 10. */
export const TRIAL_MAX_CLIENTES = Number(
  process.env.NEXT_PUBLIC_TRIAL_MAX_CLIENTES ?? 10
);

export const TRIAL_DIAS = Number(process.env.NEXT_PUBLIC_TRIAL_DIAS ?? 7);
