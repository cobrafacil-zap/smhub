import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanoConfig } from "@/types/database";

/**
 * Lista de planos — dados quase estáticos (3 planos, só mudam quando o
 * super-admin edita valor/nome em /super-admin/financeiro). Cacheada
 * cross-request com unstable_cache (1h) + tag "planos" invalidada na action
 * que altera planos. Antes, cada uma das 5 páginas que listam planos
 * refazia a query a cada request.
 */
export const getPlanos = unstable_cache(
  async (): Promise<PlanoConfig[]> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("planos")
      .select("*")
      .order("valor_mensal");
    return (data ?? []) as PlanoConfig[];
  },
  ["planos"],
  { revalidate: 3600, tags: ["planos"] }
);