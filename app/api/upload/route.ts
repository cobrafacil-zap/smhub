import { NextRequest, NextResponse } from "next/server";
import { uploadFileServer } from "@/lib/storage";
import { requireAgenciaMember, requireSuperAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/constants";

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
    await requireSuperAdmin();
    try {
      const data = await uploadFileServer({
        bucket: bucket as never,
        path: subPath,
        file,
        contentType: file.type,
        token: "", // service-role client no storage server? usa token abaixo
      });
      return NextResponse.json({ ok: true, data });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Erro no upload" },
        { status: 500 }
      );
    }
  }

  // Demais buckets: agência autenticada, path prefixado por agencia_id.
  const session = await requireAgenciaMember();
  const path = `${session.profile.agencia_id}/${subPath}`;
  const supabase = createClient();
  const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
  try {
    const data = await uploadFileServer({
      bucket: bucket as never,
      path,
      file,
      contentType: file.type,
      token,
    });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro no upload" },
      { status: 500 }
    );
  }
}