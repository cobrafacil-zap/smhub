"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, MoreHorizontal, Pencil, Trash2, X, Check, Layers, CalendarDays, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  criarQuadroAction,
  renomearQuadroAction,
  excluirQuadroAction,
} from "@/lib/actions/quadro-actions";
import { criarQuadroComColunasAction } from "@/lib/actions/coluna-actions";
import { periodoRef } from "@/lib/planejamento";
import type { TarefaQuadro } from "@/types/database";

/**
 * Tabs horizontais no estilo Trello: um quadro por tab, mais atalhos pra
 * criar o quadro "desta semana" / "próxima semana" (admin only). Cada tab
 * tem menu `…` pra renomear/excluir. O "Quadro geral" (mais antigo) tem
 * badge "padrão" e não pode ser excluído.
 */
export function QuadroTabs({
  quadros,
  quadroAtivoId,
  podeEditar,
}: {
  quadros: TarefaQuadro[];
  quadroAtivoId: string;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const geralId = quadros[0]?.id ?? null;

  const irPara = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("quadro", id);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {quadros.map((q) => (
          <QuadroTab
            key={q.id}
            quadro={q}
            ativo={q.id === quadroAtivoId}
            isGeral={q.id === geralId}
            podeEditar={podeEditar}
            onSelecionar={() => irPara(q.id)}
          />
        ))}
        {podeEditar && <NovoQuadroBotao />}
      </div>
      {podeEditar && <QuadroAtalhosSemana irPara={irPara} />}
    </div>
  );
}

// ============================================================================
// ATALHOS "DESTA SEMANA" / "PRÓXIMA SEMANA"
// ============================================================================
function QuadroAtalhosSemana({ irPara }: { irPara: (id: string) => void }) {
  const [pending, startTransition] = useTransition();

  function criar(nome: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("nome", nome);
      const res = await criarQuadroComColunasAction(fd);
      if (res?.error) {
        alert(res.error);
        return;
      }
      if (res?.id) irPara(res.id);
    });
  }

  const hoje = new Date();
  const refIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const labelAtual = periodoRef(refIso, "semana", hoje).label;
  const prox = new Date(hoje);
  prox.setDate(prox.getDate() + 7);
  const proxIso = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}-${String(prox.getDate()).padStart(2, "0")}`;
  const labelProx = periodoRef(proxIso, "semana", hoje).label;

  return (
    <div className="flex items-center gap-1 ml-auto">
      <button
        type="button"
        disabled={pending}
        onClick={() => criar(`Semana ${labelAtual}`)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-slate-400 hover:text-royal-200 hover:border-royal-500/40 hover:bg-royal-500/5 transition disabled:opacity-50"
        title={`Criar quadro desta semana (${labelAtual})`}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Desta semana
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => criar(`Semana ${labelProx}`)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-slate-400 hover:text-royal-200 hover:border-royal-500/40 hover:bg-royal-500/5 transition disabled:opacity-50"
        title={`Criar quadro da próxima semana (${labelProx})`}
      >
        <ChevronRight className="h-3.5 w-3.5" />
        Próxima
      </button>
    </div>
  );
}

// ============================================================================
// TAB INDIVIDUAL
// ============================================================================
function QuadroTab({
  quadro,
  ativo,
  isGeral,
  podeEditar,
  onSelecionar,
}: {
  quadro: TarefaQuadro;
  ativo: boolean;
  isGeral: boolean;
  podeEditar: boolean;
  onSelecionar: () => void;
}) {
  const [renomeando, setRenomeando] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fecha o menu `…` ao clicar fora.
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition shrink-0",
        ativo
          ? "bg-royal-500/15 text-royal-200 border-royal-500/40"
          : "text-slate-400 border-border hover:bg-bg-elevated hover:text-royal-300"
      )}
    >
      <Layers className="h-3.5 w-3.5 opacity-70" />
      {renomeando ? (
        <RenameInput
          initial={quadro.nome}
          onConfirm={async (novo) => {
            if (!novo || novo === quadro.nome) {
              setRenomeando(false);
              return;
            }
            const res = await renomearQuadroAction(quadro.id, novo);
            if (res?.error) {
              alert(res.error);
            }
            setRenomeando(false);
          }}
          onCancel={() => setRenomeando(false)}
        />
      ) : (
        <button
          type="button"
          onClick={onSelecionar}
          className="max-w-[160px] truncate text-left"
          title={quadro.nome}
        >
          {quadro.nome}
        </button>
      )}

      {isGeral && !renomeando && (
        <span className="text-[9px] uppercase tracking-wider text-slate-500 bg-bg-elevated rounded px-1 py-0.5">
          padrão
        </span>
      )}

      {podeEditar && !renomeando && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "h-6 w-6 inline-flex items-center justify-center rounded text-slate-400 hover:text-royal-300 hover:bg-bg-elevated",
              // Em mobile (<sm) o menu fica sempre visível (não tem hover).
              // Em sm+ só aparece no hover/focus do tab.
              ativo
                ? "opacity-100"
                : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
            )}
            title="Ações do quadro"
            aria-label="Ações do quadro"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-border bg-bg-elevated shadow-xl py-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setRenomeando(true);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-bg-muted inline-flex items-center gap-2"
              >
                <Pencil className="h-3.5 w-3.5" /> Renomear
              </button>
              {!isGeral && (
                <ConfirmDialog
                  trigger={
                    <button
                      type="button"
                      onClick={() => setMenuOpen(false)}
                      className="w-full text-left px-3 py-1.5 text-xs text-danger-400 hover:bg-bg-muted inline-flex items-center gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  }
                  title={`Excluir "${quadro.nome}"?`}
                  description={
                    <span>
                      As tarefas deste quadro serão movidas para o "Quadro geral".
                      Esta ação não pode ser desfeita.
                    </span>
                  }
                  confirmText="Excluir"
                  variant="danger"
                  onConfirm={async () => {
                    const res = await excluirQuadroAction(quadro.id);
                    if (res?.error) {
                      alert(res.error);
                    } else {
                      // Redireciona pro Quadro geral (ou pra raiz /admin/tarefas)
                      window.location.href = "/admin/tarefas";
                    }
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INPUT DE RENOMEAR (inline)
// ============================================================================
function RenameInput({
  initial,
  onConfirm,
  onCancel,
}: {
  initial: string;
  onConfirm: (novo: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [valor, setValor] = useState(initial);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm(valor);
      }}
      className="flex items-center gap-1"
    >
      <input
        ref={inputRef}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        maxLength={80}
        className="h-6 w-32 bg-bg-surface border border-border rounded px-1.5 text-xs text-slate-100 focus:outline-none focus:border-royal-500"
      />
      <button
        type="submit"
        className="h-6 w-6 inline-flex items-center justify-center rounded text-emerald-400 hover:bg-bg-elevated"
        title="Salvar"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-6 w-6 inline-flex items-center justify-center rounded text-slate-400 hover:bg-bg-elevated"
        title="Cancelar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

// ============================================================================
// BOTÃO "+ NOVO QUADRO" (input inline)
// ============================================================================
function NovoQuadroBotao() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  const submit = useCallback(() => {
    if (!nome.trim()) {
      setError("Digite um nome.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("nome", nome.trim());
      const res = await criarQuadroAction(undefined, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setNome("");
      setError(null);
      setAberto(false);
      // Redireciona pro novo quadro (precisa do id retornado pela action).
      if (res?.id) {
        window.location.href = `/admin/tarefas?quadro=${res.id}`;
      } else {
        window.location.reload();
      }
    });
  }, [nome]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-royal-200 hover:border-royal-500/40 hover:bg-royal-500/5 transition"
      >
        <Plus className="h-3.5 w-3.5" /> Novo quadro
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="shrink-0 flex items-center gap-1 rounded-lg border border-royal-500/40 bg-royal-500/10 px-2 py-1"
    >
      <Input
        ref={inputRef}
        value={nome}
        onChange={(e) => {
          setNome(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setAberto(false);
            setNome("");
            setError(null);
          }
        }}
        maxLength={80}
        placeholder="Nome do quadro"
        className="h-7 w-40 text-sm !py-0"
        disabled={pending}
      />
      <Button type="submit" size="sm" disabled={pending} loading={pending}>
        Criar
      </Button>
      <button
        type="button"
        onClick={() => {
          setAberto(false);
          setNome("");
          setError(null);
        }}
        className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:bg-bg-elevated"
        title="Cancelar"
        disabled={pending}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {error && (
        <span className="text-[10px] text-danger-400 ml-1">{error}</span>
      )}
    </form>
  );
}
