import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase browser-side.
 *
 * Usa o createBrowserClient do @supabase/ssr que já vem com o
 * cookie adapter correto para o navegador. Os tokens ficam em
 * cookies HttpOnly que o servidor (middleware) consegue ler e
 * renovar; o browser apenas dispara as requisições HTTP normais.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
