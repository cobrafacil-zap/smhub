import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList, Plus, Trash2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { BriefingForm } from "./BriefingForm";
import { DeletarBriefingButton } from "./DeletarBriefingButton";
import type { Briefing, Cliente } from "@/types/database";
import type { Json } from "@/types/database";

type RespostaValue = string | number | boolean | null | { pergunta: string; resposta: string }[] | RespostaValue[] | { [k: string]: RespostaValue };

type BriefingRenderItem =
  | { kind: "titulo"; titulo: string }
  | { kind: "par"; pergunta: string; resposta: string };

function normalizarRespostas(json: Json): BriefingRenderItem[] {
  if (!json) return [];
  if (Array.isArray(json)) {
    return (json as RespostaValue[]).flatMap((item): BriefingRenderItem[] => {
      if (typeof item === "string") return [{ kind: "par", pergunta: "—", resposta: item }];
      if (item && typeof item === "object" && !Array.isArray(item) && "pergunta" in item && "resposta" in item) {
        const obj = item as { pergunta: unknown; resposta: unknown };
        const perg = String(obj.pergunta);
        if (perg.startsWith("__titulo__:")) {
          return [{ kind: "titulo", titulo: perg.replace("__titulo__:", "") }];
        }
        return [{ kind: "par", pergunta: perg, resposta: String(obj.resposta) }];
      }
      return [{ kind: "par", pergunta: "—", resposta: JSON.stringify(item) }];
    });
  }
  if (typeof json === "object") {
    return Object.entries(json as Record<string, RespostaValue>).map(([k, v]) => ({
      kind: "par",
      pergunta: k,
      resposta: typeof v === "string" ? v : JSON.stringify(v),
    }));
  }
  return [{ kind: "par", pergunta: "Resposta", resposta: String(json) }];
}

export async function BriefingTab({ cliente }: { cliente: Cliente }) {
  const supabase = createClient();
  const { data: briefings } = await supabase
    .from("briefings")
    .select("*, usuarios:preenchido_por(nome)")
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: false });
  const list = (briefings as (Briefing & { usuarios?: { nome: string } | null })[] | null) ?? [];

  return (
    <div className="space-y-4">
      <BriefingForm clienteId={cliente.id} defaultOpen={list.length === 0} />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-8 w-8" />}
            title="Vamos começar com o briefing"
            description="É a primeira vez que você cadastra este cliente. Crie um briefing inicial com as principais informações do negócio — você poderá editar e adicionar mais tarde."
            action={
              <p className="text-xs text-slate-500 italic">
                👆 O formulário acima já está aberto. Preencha e salve.
              </p>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((b) => {
            const itens = normalizarRespostas(b.respostas);
            const titulo = itens.find((i): i is Extract<BriefingRenderItem, { kind: "titulo" }> => i.kind === "titulo")?.titulo ?? "Briefing";
            const pares = itens.filter((i): i is Extract<BriefingRenderItem, { kind: "par" }> => i.kind === "par");
            return (
              <Card key={b.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-royal-300" />
                      <h4 className="text-sm font-semibold text-slate-100">
                        {titulo}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500">
                      Preenchido em {formatDate(b.created_at)}
                      {b.usuarios?.nome && (
                        <> por <span className="text-slate-300">{b.usuarios.nome}</span></>
                      )}
                    </p>
                  </div>
                  <DeletarBriefingButton id={b.id} />
                </div>
                {pares.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Sem respostas.</p>
                ) : (
                  <div className="space-y-3">
                    {pares.map((p, i) => (
                      <div key={i} className="rounded-md bg-bg-elevated/50 px-3 py-2 border border-border">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          {p.pergunta}
                        </p>
                        <p className="text-sm text-slate-100 whitespace-pre-wrap">{p.resposta || <span className="italic text-slate-500">Sem resposta</span>}</p>
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
