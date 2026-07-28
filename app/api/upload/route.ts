import { NextRequest, NextResponse } from "next/server";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const bucket = String(form.get("bucket") ?? "");
  const subPath = String(form.get("path") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }
  if (!bucket || !subPath) {
    return NextResponse.json({ error: "Bucket e path são obrigatórios" }, { status: 400 });
  }
  if (!Object.values(STORAGE_BUCKETS).includes(bucket as never)) {
    return NextResponse.json({ error: "Bucket inválido" }, { status: 400 });
  }

  // Assets da plataforma (logos claro/escuro etc.) são gerenciados pelo
  // super-admin: não há agencia_id para prefixar o path.
  if (bucket === STORAGE_BUCKETS.platform) {
    const session = await getSessionUser();
    if (!session || session.profile.role !== "super_admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
    try {
      const admin = createAdminClient();
      const data = await admin.storage
        .from(bucket)
        .upload(subPath, file, { contentType: file.type, upsert: true });
      return NextResponse.json({ ok: true, data });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Erro no upload" },
        { status: 500 }
      );
    }
  }

  // Demais buckets: agência (admin/membro) ou cliente, ambos autenticados.
  // Path prefixado por agencia_id (a do cliente vem de session.cliente.agencia_id).
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const role = session.profile.role;
  const isAgencia = role === "admin_agencia" || role === "membro_equipe";
  const isCliente = role === "cliente";
  if (!isAgencia && !isCliente) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  // Cliente só pode escrever no bucket de assets do cliente (foto de perfil etc.).
  if (isCliente && bucket !== STORAGE_BUCKETS.client) {
    return NextResponse.json({ error: "Bucket não permitido para cliente" }, { status: 403 });
  }
  const agenciaId = isAgencia
    ? session.profile.agencia_id
    : session.cliente?.agencia_id ?? null;
  if (!agenciaId) {
    return NextResponse.json({ error: "Sem agência vinculada" }, { status: 400 });
  }

  const path = `${agenciaId}/${subPath}`;
  // Service-role no storage: bypassa storage RLS e funciona pra agência e cliente
  // (o escopo já está garantido pelo agencia_id no path + pela autenticação acima).
  try {
    const admin = createAdminClient();
    const data = await admin.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type, upsert: true });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no upload" },
      { status: 500 }
    );
  }
}