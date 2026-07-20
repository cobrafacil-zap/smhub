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

// Factory isolada só pra o TypeScript INFERIR o tipo exato do cliente (com o
// schema tipado). Se tipássemos o cache como `ReturnType<typeof
// createBrowserClient>`, o generic do supabase-js resolveria pra DefaultSchema
// e toda query voltaria `never` (169+ erros de tipo). `ReturnType<typeof
// makeAdmin>` preserva o tipo inferido da chamada real.
function makeAdmin() {
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

// Singleton em escopo de módulo: instanciar o cliente Supabase a cada chamada
// recria o fetcher/config — desperdício em páginas que chamam createAdminClient
// várias vezes por request. Reusar a mesma instância é mais barato e mantém o
// pool de conexões HTTP (keep-alive) entre chamadas.
let _admin: ReturnType<typeof makeAdmin> | null = null;

export function createAdminClient() {
  if (_admin) return _admin;
  _admin = makeAdmin();
  return _admin;
}