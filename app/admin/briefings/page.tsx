import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList } from "lucide-react";
import { NovoBriefingButton } from "./NovoBriefingButton";
import { BriefingCard } from "@/components/briefings/BriefingCard";
import type { Briefing, Cliente, Json } from "@/types/database";

export const metadata = { title: "Briefings" };

type ParItem = { pergunta: string; resposta: string };

/** Extrai o título + TODOS os pares (para pré-preencher o formulário de edição). */
function extrairParaEdicao(respostas: Json): { titulo: string; pares: ParItem[] } {
  if (!Array.isArray(respostas)) return { titulo: "Briefing", pares: [] };
  let titulo = "Briefing";
  const pares: ParItem[] = [];
  for (const item of respostas as unknown[]) {
    if (
      !!item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      "pergunta" in (item as Record<string, unknown>) &&
      "resposta" in (item as Record<string, unknown>)
    ) {
      const par = item as ParItem;
      if (par.pergunta.startsWith("__titulo__:")) {
        titulo = par.pergunta.replace("__titulo__:", "") || "Briefing";
      } else {
        pares.push({ pergunta: par.pergunta, resposta: par.resposta });
      }
    }
  }
  return { titulo, pares };
}

export default async function BriefingsPage() {
  const session = await requireAgenciaMember();
  const supabase = createAdminClient();
  const [{ data: briefings }, { data: clientesAtivos }] = await Promise.all([
    supabase
      .from("briefings")
      .select("*, cliente:clientes(nome_empresa)")
      .eq("agencia_id", session.profile.agencia_id!)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("clientes")
      .select("id, nome_empresa")
      .eq("agencia_id", session.profile.agencia_id!)
      .in("status", ["ativo", "pausado"])
      .order("nome_empresa"),
  ]);
  const list = (briefings ?? []) as (Briefing & { cliente: Pick<Cliente, "nome_empresa"> | null })[];
  const clientes = (clientesAtivos as Pick<Cliente, "id" | "nome_empresa">[] | null) ?? [];
  const podeEditar = session.profile.role === "admin_agencia";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Briefings"
        description="Briefings preenchidos pela agência (internos — o cliente não vê)."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Briefings" }]}
        actions={podeEditar ? <NovoBriefingButton clientes={clientes} /> : null}
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="Nenhum briefing"
            description={
              podeEditar
                ? "Crie um briefing preenchendo em nome do cliente. Ele não será visível para o cliente."
                : "Nenhum briefing cadastrado ainda. Quando a agência criar, você poderá ver aqui."
            }
            action={
              podeEditar && clientes.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Cadastre um cliente ativo antes.
                </p>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((b) => {
            const paraEdicao = extrairParaEdicao(b.respostas);
            return (
              <BriefingCard
                key={b.id}
                briefingId={b.id}
                clienteId={b.cliente_id}
                clienteNome={b.cliente?.nome_empresa ?? "—"}
                titulo={paraEdicao.titulo}
                pares={paraEdicao.pares}
                createdAt={b.created_at}
                interno={b.interno}
                podeEditar={podeEditar}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}