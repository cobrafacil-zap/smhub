"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Plus, Check, X } from "lucide-react";
import { criarEntradaAction } from "@/lib/actions/agencia-actions";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { DataComemorativa } from "@/types/database";

interface Props {
  datas: DataComemorativa[];
  planejamentoId: string | null;
  /** IDs de segmentos do cliente para filtrar sugestões relevantes. */
  clienteSegmento: string | null | undefined;
}

/**
 * Mostra uma lista de datas comemorativas do mês como sugestão para o
 * planejamento. Cada data pode ser:
 *  - Adicionada como entrada (cria um post no planejamento)
 *  - Descartada (some da lista da sessão)
 */
export function DatasComemorativasSugestoes({
  datas,
  planejamentoId,
  clienteSegmento,
}: Props) {
  const router = useRouter();
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set());
  const [adicionadas, setAdicionadas] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  if (datas.length === 0) return null;

  // Filtra por segmento do cliente (se a data tiver segmentos, só mostra os compatíveis)
  const relevantes = datas.filter((d) => {
    if (descartadas.has(d.id)) return false;
    if (!d.segmento || d.segmento.length === 0) return true;
    if (!clienteSegmento) return true;
    return d.segmento.includes(clienteSegmento);
  });

  if (relevantes.length === 0) return null;

  function adicionar(data: DataComemorativa) {
    if (!planejamentoId) {
      toast.error("Crie o planejamento do mês antes de adicionar entradas.");
      return;
    }
    const fd = new FormData();
    fd.set("planejamento_id", planejamentoId);
    fd.set("data", data.data);
    fd.set("tipo", "post_feed");
    fd.set("titulo", data.nome);
    fd.set("status", "pendente");
    startTransition(async () => {
      const res = await criarEntradaAction(fd);
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setAdicionadas((prev) => new Set(prev).add(data.id));
      toast.success(`"${data.nome}" adicionado ao planejamento.`);
      router.refresh();
    });
  }

  function descartar(data: DataComemorativa) {
    setDescartadas((prev) => new Set(prev).add(data.id));
    toast.success("Sugestão descartada.");
  }

  return (
    <Card className="!border-royal-500/30 !bg-royal-500/5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-md bg-royal-500/20 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-royal-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">
            Datas comemorativas do mês
          </p>
          <p className="text-xs text-slate-400">
            Sugestões de conteúdo sazonal. Clique para adicionar ao planejamento.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {relevantes.map((d) => {
          const jaAdicionada = adicionadas.has(d.id);
          return (
            <div
              key={d.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-bg-elevated/50 border border-border"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100 truncate">{d.nome}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500">{formatDate(d.data)}</span>
                  {d.segmento && d.segmento.length > 0 && (
                    <Badge variant="default" className="!text-[9px] !px-1 !py-0">
                      {d.segmento.slice(0, 2).join(" / ")}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {jaAdicionada ? (
                  <Badge variant="success" className="!text-[10px]">
                    <Check className="h-3 w-3 mr-0.5" /> Adicionado
                  </Badge>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => adicionar(d)}
                      disabled={pending || !planejamentoId}
                      iconLeft={<Plus className="h-3.5 w-3.5" />}
                    >
                      Adicionar
                    </Button>
                    <button
                      type="button"
                      onClick={() => descartar(d)}
                      disabled={pending}
                      className="p-1.5 rounded text-slate-400 hover:text-danger-400 hover:bg-danger-500/10"
                      title="Descartar sugestão"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
