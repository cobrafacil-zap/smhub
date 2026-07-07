import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildContractSignatureHash } from "@/lib/hash";
import type { AssinaturaRegistro } from "@/types/database";

/**
 * POST /api/contratos/[id]/assinar
 *
 * Body: { signatureDataUrl: string }
 *
 * Registra a assinatura do cliente com:
 *   - timestamp ISO
 *   - IP (x-forwarded-for / x-real-ip)
 *   - user-agent
 *   - HMAC SHA-256 do payload (juridicamente relevante)
 *
 * Requer: usuário autenticado com role=cliente e cliente_id = contrato.cliente_id.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = (await request.json()) as { signatureDataUrl?: string };
  if (!body.signatureDataUrl) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role, cliente_id")
    .eq("user_id", user.id)
    .single();
  if (!usuario || usuario.role !== "cliente" || !usuario.cliente_id) {
    return NextResponse.json({ error: "Apenas clientes podem assinar." }, { status: 403 });
  }

  const { data: contrato, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", params.id)
    .eq("cliente_id", usuario.cliente_id)
    .single();
  if (error || !contrato) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }
  if (!["enviado", "rascunho"].includes(contrato.status)) {
    return NextResponse.json(
      { error: "Este contrato não pode mais ser assinado." },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "0.0.0.0";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
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
    signature_data_url: body.signatureDataUrl,
  });

  const { error: upErr } = await supabase
    .from("contratos")
    .update({
      status: "assinado",
      assinaturas: assinaturas as unknown as Record<string, unknown>[],
    })
    .eq("id", params.id);

  if (upErr) {
    return NextResponse.json({ error: "Erro ao salvar assinatura." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, hash, data });
}
