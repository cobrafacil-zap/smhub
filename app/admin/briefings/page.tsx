import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NovoBriefingButton } from "./NovoBriefingButton";
import { EditarBriefingButton } from "@/app/admin/clientes/[id]/EditarBriefingButton";
import type { Briefing, Cliente, Json } from "@/types/database";

export const metadata = { title: "Briefings" };

type ParItem = { pergunta: string; resposta: string };

/** Extrai os pares pergunta/resposta do jsonb (formato do BriefingForm). */
function extrairPares(respostas: Json): ParItem[] {
  if (!Array.isArray(respostas)) return [];
  return (respostas as unknown[])
    .filter(
      (item): item is ParItem =>
        !!item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        "pergunta" in (item as Record<string, unknown>) &&
        "resposta" in (item as Record<string, unknown>) &&
        !String((item as ParItem).pergunta).startsWith("__titulo__:")
    )
    .slice(0, 3);
}

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Briefings"
        description="Briefings preenchidos pela agência (internos — o cliente não vê)."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Briefings" }]}
        actions={<NovoBriefingButton clientes={clientes} />}
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="Nenhum briefing"
            description="Crie um briefing preenchendo em nome do cliente. Ele não será visível para o cliente."
            action={
              clientes.length > 0 ? undefined : (
                <p className="text-xs text-slate-500 italic">
                  Cadastre um cliente ativo antes.
                </p>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((b) => {
            const pares = extrairPares(b.respostas);
            const paraEdicao = extrairParaEdicao(b.respostas);
            return (
              <Card key={b.id}>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-medium text-slate-100 truncate">
                      {b.cliente?.nome_empresa ?? "—"}
                    </p>
                    {b.interno && (
                      <Badge variant="warning" className="!text-[10px] !px-1.5 !py-0">
                        Interno — só admin
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <EditarBriefingButton
                      briefingId={b.id}
                      tituloInicial={paraEdicao.titulo}
                      paresIniciais={paraEdicao.pares}
                    />
                    <p className="text-xs text-slate-500">{formatDate(b.created_at)}</p>
                  </div>
                </div>
                {pares.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Sem respostas.</p>
                ) : (
                  <div className="space-y-2 text-sm text-slate-300">
                    {pares.map((p, i) => (
                      <div key={i}>
                        <p className="text-slate-400 text-xs uppercase tracking-wider">{p.pergunta}</p>
                        <p className="text-slate-100 whitespace-pre-wrap line-clamp-2">
                          {p.resposta || <span className="italic text-slate-500">Sem resposta</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}