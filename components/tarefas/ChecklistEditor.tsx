"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  criarChecklistAction,
  criarChecklistItemAction,
  editarChecklistItemAction,
  excluirChecklistAction,
  excluirChecklistItemAction,
  moverChecklistItemAction,
  renomearChecklistAction,
  toggleChecklistItemAction,
} from "@/lib/actions/tarefa-checklist-actions";

export type ChecklistItem = {
  id: string;
  texto: string;
  concluido: boolean;
  /** Posição no DB (numeric). Opcional no estado local — só é setado depois
   *  que o item é persistido no DB (ordem = 1024 * row_number). */
  ordem?: number;
};
export type Checklist = {
  id: string;
  nome: string;
  itens: ChecklistItem[];
};

export function ChecklistEditor({
  tarefaId,
  checklists: iniciais,
  onChange,
}: {
  tarefaId: string;
  checklists: Checklist[];
  /** Callback pra o pai atualizar a lista (após qualquer mutation). */
  onChange: (novo: Checklist[]) => void;
}) {
  return (
    <div className="space-y-3">
      {iniciais.map((c) => (
        <ChecklistBloco
          key={c.id}
          tarefaId={tarefaId}
          checklist={c}
          onChange={(atualizada) => {
            onChange(
              iniciais.map((x) => (x.id === atualizada.id ? atualizada : x))
            );
          }}
          onExcluir={() => onChange(iniciais.filter((x) => x.id !== c.id))}
        />
      ))}
      <NovaChecklist tarefaId={tarefaId} onCriada={(c) => onChange([...iniciais, c])} />
    </div>
  );
}

// ============================================================================
// BLOCO DE UMA CHECKLIST
// ============================================================================
function ChecklistBloco({
  tarefaId: _tarefaId,
  checklist,
  onChange,
  onExcluir,
}: {
  tarefaId: string;
  checklist: Checklist;
  onChange: (c: Checklist) => void;
  onExcluir: () => void;
}) {
  const [expandido, setExpandido] = useState(true);
  const [renomeando, setRenomeando] = useState(false);
  const [novoNome, setNovoNome] = useState(checklist.nome);
  const [, startTransition] = useTransition();

  const total = checklist.itens.length;
  const concluidos = checklist.itens.filter((i) => i.concluido).length;
  const pct = total === 0 ? 0 : Math.round((concluidos / total) * 100);

  function persistOrdem(novaOrdemItens: ChecklistItem[]) {
    onChange({ ...checklist, itens: novaOrdemItens });
  }

  function renomear() {
    const n = novoNome.trim();
    if (n.length === 0 || n === checklist.nome) {
      setRenomeando(false);
      setNovoNome(checklist.nome);
      return;
    }
    startTransition(async () => {
      const res = await renomearChecklistAction(checklist.id, n);
      if (res?.error) {
        alert(res.error);
        return;
      }
      onChange({ ...checklist, nome: n });
      setRenomeando(false);
    });
  }

  function excluir() {
    if (!confirm(`Excluir a checklist "${checklist.nome}"?`)) return;
    startTransition(async () => {
      const res = await excluirChecklistAction(checklist.id);
      if (res?.error) {
        alert(res.error);
        return;
      }
      onExcluir();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-bg-elevated/40 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-slate-400 shrink-0" />
        {renomeando ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              renomear();
            }}
            className="flex-1 flex items-center gap-1"
          >
            <Input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              maxLength={80}
              className="h-7 text-sm flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setRenomeando(false);
                  setNovoNome(checklist.nome);
                }
              }}
            />
            <Button type="submit" size="sm">
              Salvar
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left text-sm font-semibold text-slate-100"
          >
            {expandido ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
            <span className="truncate">{checklist.nome}</span>
            <span className="text-[10px] font-normal text-slate-500">
              {concluidos}/{total}
            </span>
          </button>
        )}
        {!renomeando && (
          <button
            type="button"
            onClick={() => setRenomeando(true)}
            className="text-xs text-slate-400 hover:text-royal-200"
            title="Renomear"
          >
            Renomear
          </button>
        )}
        <button
          type="button"
          onClick={excluir}
          className="text-slate-400 hover:text-danger-400"
          title="Excluir checklist"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {total > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-bg-muted overflow-hidden">
            <div
              className="h-full bg-success-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500">{pct}% concluído</p>
        </div>
      )}

      {expandido && (
        <div className="space-y-1">
          {checklist.itens.map((item, idx) => (
            <ItemEditor
              key={item.id}
              item={item}
              itens={checklist.itens}
              onChange={persistOrdem}
              onRemover={(idRem) =>
                persistOrdem(checklist.itens.filter((i) => i.id !== idRem))
              }
            />
          ))}
          <NovoItem
            checklistId={checklist.id}
            onCriado={(novo) => persistOrdem([...checklist.itens, novo])}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ITEM DA CHECKLIST (com drag pra reordenar)
// ============================================================================
function ItemEditor({
  item,
  itens,
  onChange,
  onRemover,
}: {
  item: ChecklistItem;
  itens: ChecklistItem[];
  onChange: (novos: ChecklistItem[]) => void;
  onRemover: (id: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(item.texto);
  const [, startTransition] = useTransition();
  const draggingRef = useRef(false);

  function toggle() {
    startTransition(async () => {
      const res = await toggleChecklistItemAction(item.id, !item.concluido);
      if (res?.error) {
        alert(res.error);
        return;
      }
      onChange(
        itens.map((i) => (i.id === item.id ? { ...i, concluido: !i.concluido } : i))
      );
    });
  }

  function salvar() {
    const t = texto.trim();
    if (t.length === 0 || t === item.texto) {
      setEditando(false);
      setTexto(item.texto);
      return;
    }
    startTransition(async () => {
      const res = await editarChecklistItemAction(item.id, t);
      if (res?.error) {
        alert(res.error);
        return;
      }
      onChange(itens.map((i) => (i.id === item.id ? { ...i, texto: t } : i)));
      setEditando(false);
    });
  }

  function excluir() {
    startTransition(async () => {
      const res = await excluirChecklistItemAction(item.id);
      if (res?.error) {
        alert(res.error);
        return;
      }
      onRemover(item.id);
    });
  }

  function moverAntes(antesDeId: string | null) {
    // Reordena otimisticamente
    const semAtual = itens.filter((i) => i.id !== item.id);
    const idx = antesDeId
      ? semAtual.findIndex((i) => i.id === antesDeId)
      : semAtual.length;
    const novaLista = [...semAtual];
    novaLista.splice(idx === -1 ? novaLista.length : idx, 0, item);
    onChange(novaLista);
    startTransition(async () => {
      const res = await moverChecklistItemAction(item.id, antesDeId);
      if (res?.error) {
        alert(res.error);
      }
    });
  }

  // DnD HTML5 simples: dragstart grava o id; drop num item chama moverAntes.
  function onDragStart(e: React.DragEvent) {
    draggingRef.current = true;
    e.dataTransfer.setData("text/checklist-item", item.id);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => {
        draggingRef.current = false;
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        const srcId = e.dataTransfer.getData("text/checklist-item");
        if (!srcId || srcId === item.id) return;
        e.preventDefault();
        e.stopPropagation();
        // srcId vai ficar ANTES deste item
        if (srcId !== item.id) {
          // chama moverChecklistItemAction(srcId, item.id) mas com a lista
          // otimista local — chamamos via moverChecklistItemAction direto:
          startTransition(async () => {
            const res = await moverChecklistItemAction(srcId, item.id);
            if (res?.error) {
              alert(res.error);
            }
          });
          // também atualiza a ordem visual localmente
          const sem = itens.filter((i) => i.id !== srcId);
          const idx = sem.findIndex((i) => i.id === item.id);
          sem.splice(idx, 0, {
            ...(itens.find((i) => i.id === srcId)!),
          });
          onChange(sem);
        }
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-bg-muted transition group/item",
        draggingRef.current && "opacity-40"
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-slate-600 cursor-grab shrink-0" />
      <input
        type="checkbox"
        checked={item.concluido}
        onChange={toggle}
        className="h-4 w-4 rounded border-border accent-success-500 shrink-0"
      />
      {editando ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
          className="flex-1 flex items-center gap-1"
        >
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={300}
            className="h-7 text-xs flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditando(false);
                setTexto(item.texto);
              }
            }}
          />
          <Button type="submit" size="sm">
            OK
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className={cn(
            "flex-1 text-left text-xs",
            item.concluido
              ? "line-through text-slate-500"
              : "text-slate-200"
          )}
        >
          {item.texto}
        </button>
      )}
      {!editando && (
        <button
          type="button"
          onClick={excluir}
          className="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-danger-400 transition"
          title="Excluir item"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {/* handlers pra mover pra "fim" (drop no último item ou área vazia) */}
      <button
        type="button"
        onClick={() => moverAntes(null)}
        className="opacity-0 group-hover/item:opacity-100 text-[10px] text-slate-500 hover:text-royal-200 transition"
        title="Mover pro fim"
      >
        ↓
      </button>
    </div>
  );
}

// ============================================================================
// FORMULÁRIO INLINE PRA NOVO ITEM
// ============================================================================
function NovoItem({
  checklistId,
  onCriado,
}: {
  checklistId: string;
  onCriado: (item: ChecklistItem) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  function submit() {
    const t = texto.trim();
    if (t.length === 0) return;
    startTransition(async () => {
      const res = await criarChecklistItemAction(checklistId, t);
      if (res?.error) {
        alert(res.error);
        return;
      }
      if (res?.id) {
        onCriado({
          id: res.id,
          texto: t,
          concluido: false,
          ordem: 999999, // local; a action grava ordem real no DB
        });
      }
      setTexto("");
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-royal-200 hover:bg-bg-muted transition"
      >
        <Plus className="h-3 w-3" /> Adicionar item
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-1"
    >
      <Input
        ref={inputRef}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Novo item"
        maxLength={300}
        className="h-7 text-xs flex-1"
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setAberto(false);
            setTexto("");
          }
        }}
      />
      <Button type="submit" size="sm" loading={pending} disabled={!texto.trim()}>
        Add
      </Button>
      <button
        type="button"
        onClick={() => {
          setAberto(false);
          setTexto("");
        }}
        className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:bg-bg-muted"
      >
        <X className="h-3 w-3" />
      </button>
    </form>
  );
}

// ============================================================================
// FORMULÁRIO INLINE PRA NOVA CHECKLIST
// ============================================================================
function NovaChecklist({
  tarefaId,
  onCriada,
}: {
  tarefaId: string;
  onCriada: (c: Checklist) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const n = nome.trim();
    if (n.length === 0) return;
    startTransition(async () => {
      const res = await criarChecklistAction(tarefaId, n);
      if (res?.error) {
        alert(res.error);
        return;
      }
      if (res?.id) {
        onCriada({ id: res.id, nome: n, itens: [] });
      }
      setNome("");
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-slate-400 hover:text-royal-200 hover:border-royal-500/40 transition"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar checklist
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2"
    >
      <Input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Título da checklist"
        maxLength={80}
        className="h-8 text-sm flex-1"
        autoFocus
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setAberto(false);
            setNome("");
          }
        }}
      />
      <Button type="submit" size="sm" loading={pending} disabled={!nome.trim()}>
        Criar
      </Button>
      <button
        type="button"
        onClick={() => {
          setAberto(false);
          setNome("");
        }}
        className="text-xs text-slate-400 hover:text-royal-200"
      >
        Cancelar
      </button>
    </form>
  );
}
