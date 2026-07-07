import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase server-side (Server Components / Server Actions / Route Handlers).
 *
 * Em Next.js 14 + @supabase/ssr, o setAll() é chamado sempre que o
 * Supabase precisa gravar cookies (refresh de token, signIn, signOut).
 *
 * - Em Server Actions e Route Handlers: cookies() é gravável → grava.
 * - Em Server Components: cookies() é READ-ONLY → o setAll lança erro.
 *
 * O middleware.ts é quem de fato roda a cada request e cuida do
 * refresh do token + gravação de cookies no response. Por isso o
 * catch silencioso aqui é seguro.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Contexto read-only (Server Component). Middleware cuida do refresh.
          }
        },
      },
    }
  );
}
