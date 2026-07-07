import { createClient as createBrowserClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase ADMIN (service-role) — use APENAS em server-side.
 *
 * ⚠️ Bypassa RLS. Use somente em:
 *   - Webhooks confiáveis
 *   - Cron jobs / Edge Functions
 *   - Operações de admin explicitamente verificadas
 *
 * NUNCA exponha esta chave ao browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createBrowserClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
