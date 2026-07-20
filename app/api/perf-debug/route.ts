import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Diagnóstico de latência (só pra admin logado). Mede, a partir deste servidor:
//   - authMs: round-trip de supabase.auth.getUser() à API de Auth do Supabase.
//   - profileMs: query de profile (super_admins + usuarios em paralelo) — deve
//     ser ~0 após o 1º acesso (cacheado por 30s em unstable_cache).
//   - dbMs: round-trip de uma query trivial ao DB (select id from agencias
//     limit 1). Mede a latência pura servidor→Supabase.
//   - hostRegion: região onde ESTE servidor roda (Vercel/Fly/AWS/GCP/env).
// Use pra comparar regiões: se authMs/dbMs passam de ~150ms, o Supabase
// provavelmente está em região diferente do app — mover pra mesma região corta
// a latência de TODOS os round-trips.
//
// Segurança: só retorna números, a URL pública do projeto (NEXT_PUBLIC) e a
// região do host. Nenhum dado de linha é devolvido. Exige sessão.

// Best-effort pra descobrir a região do host via metadata da nuvem.
async function detectHostRegion(): Promise<string> {
  // 1) Env vars dos hosts conhecidos (mais rápido e confiável).
  const fromEnv =
    process.env.VERCEL_REGION ||
    process.env.FLY_REGION ||
    process.env.RAILWAY_REGION ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    process.env.GCP_REGION ||
    process.env.COOLIFY_REGION;
  if (fromEnv) return fromEnv;
  // 2) Metadata da AWS (EC2/ECS/Lightsail) — IP link-local, curto timeout.
  try {
    const r = await fetch(
      "http://169.254.169.254/latest/meta-data/placement/region",
      { signal: AbortSignal.timeout(400) }
    );
    if (r.ok) return `aws:${(await r.text()).trim()}`;
  } catch {
    /* não é AWS ou metadata desativada */
  }
  // 3) Metadata do GCP.
  try {
    const r = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/zone",
      { headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(400) }
    );
    if (r.ok) return `gcp:${(await r.text()).trim()}`;
  } catch {
    /* não é GCP */
  }
  return "unknown";
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createClient();
  const admin = createAdminClient();

  const t0 = Date.now();
  await supabase.auth.getUser();
  const authMs = Date.now() - t0;

  // Profile cacheado — 1ª chamada aquece o cache; repita pra ver ~0.
  const t1 = Date.now();
  await getSessionUser();
  const profileMs = Date.now() - t1;

  const t2 = Date.now();
  await admin.from("agencias").select("id").limit(1).maybeSingle();
  const dbMs = Date.now() - t2;

  const hostRegion = await detectHostRegion();

  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hostRegion,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    authMs,
    profileMs,
    dbMs,
    note: "authMs/dbMs > 150ms sugere região do Supabase diferente do host.",
  });
}