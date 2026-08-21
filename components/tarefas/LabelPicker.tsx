"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { criarTarefaLabelAction } from "@/lib/actions/tarefa-label-actions";
import { LabelChipSelecionavel, type LabelChip } from "./LabelChips";

const CORES_SUGERIDAS = [
  "#ef4444", // vermelho
  "#f59e0b", // âmbar
  "#eab308", // amarelo
  "#22c55e", // verde
  "#06b6d4", // ciano
  "#3b82f6", // azul
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#64748b", // cinza
];

export function LabelPicker({
  opcoes,
  selecionados,
  onChange,
  admin,
}: {
  /** Catálogo de labels disponíveis na agência. */
  opcoes: LabelChip[];
  /** IDs dos labels já aplicados na tarefa. */
  selecionados: string[];
  onChange: (novos: string[]) => void;
  /** Se true, mostra o botão de criar novo label. */
  admin: boolean;
}) {
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState(CORES_SUGERIDAS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    onChange(
      selecionados.includes(id)
        ? selecionados.filter((s) => s !== id)
        : [...selecionados, id]
    );
  }

  function criar() {
    const nome = novoNome.trim();
    if (nome.length < 1) {
      setError("Digite um nome.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("nome", nome);
      fd.set("cor", novaCor);
      const res = await criarTarefaLabelAction(undefined, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res?.id) {
        // Adiciona o novo label à lista local e já seleciona
        // (o pai vai recarregar via revalidate, mas pra UX imediata
        //  marcamos como selecionado).
        onChange([...selecionados, res.id]);
      }
      setCriando(false);
      setNovoNome("");
      setNovaCor(CORES_SUGERIDAS[0]);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {opcoes.length === 0 && !criando && (
          <p className="text-xs text-slate-500 italic">
            Nenhum label criado ainda. {admin && "Crie o primeiro abaixo."}
          </p>
        )}
        {opcoes.map((l) => (
          <LabelChipSelecionavel
            key={l.id}
            label={l}
            selecionado={selecionados.includes(l.id)}
            onClick={() => toggle(l.id)}
          />
        ))}
        {admin && !criando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-slate-400 hover:text-royal-200 hover:border-royal-500/40 transition"
          >
            <Plus className="h-3 w-3" /> Criar label
          </button>
        )}
      </div>

      {criando && (
        <div className="rounded-lg border border-royal-500/40 bg-bg-elevated p-3 space-y-2">
          <Input
            value={novoNome}
            onChange={(e) => {
              setNovoNome(e.target.value);
              setError(null);
            }}
            placeholder="Nome do label"
            maxLength={40}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setCriando(false);
                setNovoNome("");
                setError(null);
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {CORES_SUGERIDAS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNovaCor(c)}
                title={c}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition",
                  novaCor === c
                    ? "border-white scale-110"
                    : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {error && <p className="text-[10px] text-danger-400">{error}</p>}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={criar}
              loading={pending}
              disabled={!novoNome.trim()}
            >
              Criar
            </Button>
            <button
              type="button"
              onClick={() => {
                setCriando(false);
                setNovoNome("");
                setError(null);
              }}
              className="text-xs text-slate-400 hover:text-royal-200 inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
