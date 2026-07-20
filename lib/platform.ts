import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PlatformConfig } from "@/types/database";

/**
 * Configuração global da plataforma (singleton).
 *
 * Lida pelo `cache()` do React para deduplicar chamadas dentro de um mesmo
 * request (a logo é renderizada em vários componentes por página). Como usa
 * o cliente Supabase server (cookies), a renderização é dinâmica — a logo
 * atualizada pelo super-admin aparece imediatamente após `revalidatePath`.
 */
export const getPlatformConfig = cache(async (): Promise<PlatformConfig> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("platform_config")
    .select("*")
    .eq("id", "singleton")
    .maybeSingle();

  if (!data) {
    // Fallback caso a linha ainda não exista (migration não aplicada).
    return {
      id: "singleton",
      logo_url_light: null,
      logo_url_dark: null,
      updated_at: "",
    };
  }
  return data as PlatformConfig;
});

/** Versão de cache-bust derivada do updated_at (ou 0). */
export function logoVersion(updatedAt: string | null | undefined): string {
  return updatedAt ? String(new Date(updatedAt).getTime()) : "0";
}