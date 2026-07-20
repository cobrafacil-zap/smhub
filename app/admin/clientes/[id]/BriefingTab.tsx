import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList, Plus, Trash2, FileText } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { BriefingForm } from "./BriefingForm";
import { DeletarBriefingButton } from "./DeletarBriefingButton";
import { EditarBriefingButton } from "./EditarBriefingButton";
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
  const supabase = createAdminClient();
  // Importante: NÃO usar resource embedding com `preenchido_por` — essa FK
  // aponta para `auth.users(id)` (schema não exposto pelo PostgREST, e sem
  // coluna `nome`). O join fazia a query inteira falhar e, como o erro era
  // ignorado, a lista ficava sempre vazia. Buscamos os autores separadamente
  // em `public.usuarios` (onde `nome` existe, ligado por `user_id`).
  const { data: briefings, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) console.error("[BriefingTab] erro ao listar briefings:", error.message);
  const list = (briefings as Briefing[] | null) ?? [];

  // Mapa user_id -> nome dos preenchedores (de public.usuarios).
  const autores = new Map<string, string>();
  const userIds = list.map((b) => b.preenchido_por).filter((u): u is string => !!u);
  if (userIds.length > 0) {
    const { data: usuarios, error: usrErr } = await supabase
      .from("usuarios")
      .select("user_id, nome")
      .in("user_id", userIds);
    if (usrErr) console.error("[BriefingTab] erro ao buscar autores:", usrErr.message);
    for (const u of (usuarios as { user_id: string; nome: string }[] | null) ?? []) {
      autores.set(u.user_id, u.nome);
    }
  }

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
                      {b.preenchido_por && autores.has(b.preenchido_por) && (
                        <> por <span className="text-slate-300">{autores.get(b.preenchido_por)}</span></>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <EditarBriefingButton
                      briefingId={b.id}
                      tituloInicial={titulo}
                      paresIniciais={pares.map((p) => ({ pergunta: p.pergunta, resposta: p.resposta }))}
                    />
                    <DeletarBriefingButton id={b.id} />
                  </div>
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
