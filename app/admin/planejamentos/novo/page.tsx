import { requireAgenciaMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/types/database";
import { NovoPlanejamentoForm } from "./NovoPlanejamentoForm";

export const metadata = { title: "Novo planejamento" };

export default async function NovoPlanejamentoPage() {
  const session = await requireAgenciaMember();
  const supabase = createClient();
  const aid = session.profile.agencia_id!;

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome_empresa, segmento")
    .eq("agencia_id", aid)
    .in("status", ["ativo", "pausado"])
    .order("nome_empresa");
  const list = (clientes as Pick<Cliente, "id" | "nome_empresa" | "segmento">[] | null) ?? [];

  return <NovoPlanejamentoForm clientes={list} />;
}
