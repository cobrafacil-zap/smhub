"use client";

import { useState, useTransition } from "react";
import { Plus, X, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  criarBriefingAction,
  atualizarBriefingAction,
} from "@/lib/actions/fatura-briefing-actions";
import type { Cliente } from "@/types/database";

const TEMPLATE_PERGUNTAS = [
  "Nome da empresa / marca",
  "Segmento de atuação",
  "Público-alvo",
  "Objetivos de marketing",
  "Tom de voz da marca",
  "Principais concorrentes",
  "Redes sociais utilizadas",
  "Observações gerais",
];

type Par = { id: string; pergunta: string; resposta: string };

function novoId() {
  return Math.random().toString(36).slice(2, 9);
}

export function BriefingForm({
  clienteId,
  defaultOpen = false,
  clientes,
  onCreated,
  briefingId,
  tituloInicial,
  paresIniciais,
  onSaved,
}: {
  clienteId: string;
  defaultOpen?: boolean;
  /** Quando informado, mostra um seletor de cliente (uso no /admin/briefings). */
  clientes?: Pick<Cliente, "id" | "nome_empresa">[];
  /** Callback após criar com sucesso (ex.: fechar modal). */
  onCreated?: () => void;
  /** Modo edição: ID do briefing a atualizar. */
  briefingId?: string;
  tituloInicial?: string;
  paresIniciais?: { pergunta: string; resposta: string }[];
  /** Callback após salvar edição com sucesso (ex.: fechar modal + refresh). */
  onSaved?: () => void;
}) {
  const editando = !!briefingId;
  const [open, setOpen] = useState(editando || defaultOpen);
  const [clienteSel, setClienteSel] = useState(clienteId);
  const [titulo, setTitulo] = useState(tituloInicial ?? "Briefing de onboarding");
  const [pares, setPares] = useState<Par[]>(
    editando && paresIniciais && paresIniciais.length > 0
      ? paresIniciais.map((p) => ({ id: novoId(), pergunta: p.pergunta, resposta: p.resposta }))
      : TEMPLATE_PERGUNTAS.map((p) => ({ id: novoId(), pergunta: p, resposta: "" }))
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function adicionarPar() {
    setPares([...pares, { id: novoId(), pergunta: "", resposta: "" }]);
  }

  function removerPar(id: string) {
    setPares(pares.filter((p) => p.id !== id));
  }

  function atualizar(id: string, campo: "pergunta" | "resposta", valor: string) {
    setPares(pares.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const clienteFinal = clientes ? clienteSel : clienteId;
    if (clientes && !clienteFinal) {
      setError("Selecione um cliente.");
      return;
    }
    const respostas = pares
      .filter((p) => p.pergunta.trim() || p.resposta.trim())
      .map((p) => ({ pergunta: p.pergunta.trim() || "—", resposta: p.resposta.trim() }));
    if (respostas.length === 0) {
      setError("Adicione pelo menos uma pergunta e resposta.");
      return;
    }
    const fd = new FormData();
    // Formato salvo: array de { pergunta, resposta }. O titulo vai como primeiro item com prefixo __titulo__:
    fd.set("respostas", JSON.stringify([{ pergunta: `__titulo__:${titulo}`, resposta: "" }, ...respostas]));
    if (editando) {
      startTransition(async () => {
        const res = await atualizarBriefingAction(briefingId!, fd);
        if (res && "error" in res && res.error) {
          setError(res.error);
        } else {
          setSuccess(true);
          onSaved?.();
          setTimeout(() => setSuccess(false), 3000);
        }
      });
      return;
    }
    fd.set("cliente_id", clienteFinal);
    startTransition(async () => {
      const res = await criarBriefingAction(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setPares(TEMPLATE_PERGUNTAS.map((p) => ({ id: novoId(), pergunta: p, resposta: "" })));
        setTitulo("Briefing de onboarding");
        setOpen(false);
        onCreated?.();
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <Card>
      {!clientes && !editando && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-royal-500/20 flex items-center justify-center">
              <Plus className="h-4 w-4 text-royal-300" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-100">Criar briefing manualmente</p>
              <p className="text-xs text-slate-500">
                Preencha perguntas e respostas em nome do cliente.
              </p>
            </div>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
      )}

      {(open || clientes || editando) && (
        <form onSubmit={handleSubmit} className={`${clientes ? "" : "mt-4 pt-4 border-t border-border"} space-y-3`}>
          {clientes && (
            <div>
              <label className="label">Cliente *</label>
              <select
                className="input"
                value={clienteSel}
                onChange={(e) => setClienteSel(e.target.value)}
                required
              >
                <option value="">— Selecione um cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_empresa}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Título do briefing</label>
            <input
              className="input"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Briefing de onboarding"
              required
            />
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {pares.map((p) => (
              <div key={p.id} className="rounded-md bg-bg-elevated/40 p-2.5 border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1 text-xs"
                    value={p.pergunta}
                    onChange={(e) => atualizar(p.id, "pergunta", e.target.value)}
                    placeholder="Pergunta"
                  />
                  <button
                    type="button"
                    onClick={() => removerPar(p.id)}
                    className="p-1.5 rounded text-slate-500 hover:text-danger-300 hover:bg-danger-500/10"
                    title="Remover pergunta"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  className="input text-sm min-h-[60px]"
                  value={p.resposta}
                  onChange={(e) => atualizar(p.id, "resposta", e.target.value)}
                  placeholder="Resposta..."
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={adicionarPar}
            className="text-xs text-royal-300 hover:text-royal-200 inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Adicionar pergunta
          </button>

          {error && (
            <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              {editando ? "Briefing atualizado com sucesso." : "Briefing criado com sucesso."}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="submit" loading={pending} iconLeft={<Save className="h-4 w-4" />}>
              {editando ? "Salvar alterações" : "Salvar briefing"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
