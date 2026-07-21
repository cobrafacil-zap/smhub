"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorialCalendar } from "@/components/calendar/EditorialCalendar";
import { EntryEditor, type EntryFormData } from "@/components/calendar/EntryEditor";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Trash2,
  X,
  Pencil,
  CalendarPlus,
  Check,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import {
  criarEntradaAction,
  atualizarEntradaAction,
  deletarEntradaAction,
  criarPlanejamentoAction,
  atualizarEntradaStatusAction,
  atualizarDiasPostagemAction,
} from "@/lib/actions/agencia-actions";
import { ENTRY_STATUS, ENTRY_TIPO_LABEL, ENTRY_TIPO_COR } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { EntradaStatus, EntradaTipo, PlanejamentoEntrada } from "@/types/database";

interface Props {
  clienteId: string;
  planejamentoId: string | null;
  mesReferencia: string; // YYYY-MM-DD
  mesLabel: string;
  entradas: PlanejamentoEntrada[];
  /** Dias da semana marcados como dia de postagem (0=Dom..6=Sáb). */
  diasPostagem: number[] | null;
  canEdit: boolean;
  /** Membros da equipe disponíveis para atribuir como responsável pela peça. */
  membros?: { id: string; nome: string }[];
}

// Ordem de exibição (Seg..Dom). O índice interno é getDay (0=Dom..6=Sáb).
const DIAS_SEMANA: { d: number; l: string }[] = [
  { d: 1, l: "Seg" },
  { d: 2, l: "Ter" },
  { d: 3, l: "Qua" },
  { d: 4, l: "Qui" },
  { d: 5, l: "Sex" },
  { d: 6, l: "Sáb" },
  { d: 0, l: "Dom" },
];

export function PlanejamentoCalendarClient({
  clienteId,
  planejamentoId,
  mesReferencia,
  mesLabel,
  entradas,
  diasPostagem,
  canEdit,
  membros,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<PlanejamentoEntrada | "new" | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [diaSelecionado, setDiaSelecionado] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PlanejamentoEntrada | null>(null);

  // Estado local das entradas — evita recarregar a página inteira a cada ação.
  // Sincroniza com a prop `entradas` quando ela muda (ex.: troca de mês no server).
  const [lista, setLista] = useState<PlanejamentoEntrada[]>(entradas);
  useEffect(() => {
    setLista(entradas);
  }, [entradas]);

  // Estado local dos dias de postagem (sincroniza com a prop quando troca o mês).
  const [dias, setDias] = useState<number[]>((diasPostagem ?? []).map(Number));
  useEffect(() => {
    setDias((diasPostagem ?? []).map(Number));
  }, [diasPostagem]);

  function handleToggleDia(d: number) {
    if (!planejamentoId || !canEdit) return;
    const atual = new Set(dias);
    if (atual.has(d)) atual.delete(d);
    else atual.add(d);
    const prox = Array.from(atual).sort((a, b) => a - b);
    const anterior = dias;
    setDias(prox); // otimista — tinta atualiza na hora
    startTransition(async () => {
      const res = await atualizarDiasPostagemAction(planejamentoId, prox);
      if (res && "error" in res) {
        setDias(anterior); // reverte
        toast.error(res.error);
      } else if (res && "ok" in res && res.ok) {
        setDias(res.dias_postagem ?? []);
        toast.success("Dias de postagem atualizados");
      }
    });
  }

  function handleCellClick(date: string) {
    if (!canEdit) return;
    setDiaSelecionado(date);
    if (!planejamentoId) {
      setDefaultDate(date);
      // sem planejamento: sugere iniciar primeiro
      return;
    }
    setEditing("new");
    setDefaultDate(date);
  }

  function handleEntryClick(entry: PlanejamentoEntrada) {
    if (!canEdit) return;
    setDiaSelecionado(entry.data);
    setEditing(entry);
    setDefaultDate(entry.data);
  }

  function handleAdminStatus(entry: PlanejamentoEntrada, novo: EntradaStatus) {
    startTransition(async () => {
      const res = await atualizarEntradaStatusAction(entry.id, novo);
      if (res && "ok" in res && res.ok) {
        // Atualiza o status (e comentário) localmente — sem recarregar a página.
        setLista((prev) =>
          prev.map((it) =>
            it.id === res.entradaId
              ? {
                  ...it,
                  status: res.status as EntradaStatus,
                  aprovacao_comentario: res.comentario ?? it.aprovacao_comentario,
                }
              : it
          )
        );
      }
      toast.success(
        novo === "aprovado"
          ? "Entrada aprovada"
          : novo === "pendente"
          ? "Voltou para pendente"
          : novo === "alteracao_solicitada"
          ? "Mudança solicitada ao cliente"
          : "Status atualizado"
      );
    });
  }

  async function handleSave(data: EntryFormData): Promise<void> {
    if (editing === "new" || editing === null) {
      // criar
      const fd = new FormData();
      fd.set("planejamento_id", planejamentoId!);
      fd.set("data", data.data);
      fd.set("tipo", data.tipo);
      fd.set("titulo", data.titulo);
      fd.set("descricao", data.descricao ?? "");
      fd.set("copy", data.copy ?? "");
      fd.set("hashtags", data.hashtags.join(" "));
      fd.set("status", data.status);
      fd.set("estilo", data.estilo ?? "");
      fd.set("responsavel_id", data.responsavelId || "");
      startTransition(async () => {
        const res = await criarEntradaAction(fd);
        if (res && "error" in res && res.error) {
          setError(res.error);
        } else if (res && "ok" in res && res.ok && res.entrada) {
          // Insere a nova entrada no estado local — sem recarregar.
          setLista((prev) => [...prev, res.entrada as PlanejamentoEntrada]);
          setDiaSelecionado(res.entrada.data);
          setEditing(null);
          setError(null);
          toast.success("Entrada criada");
        }
      });
    } else {
      // editar
      const fd = new FormData();
      fd.set("data", data.data);
      fd.set("tipo", data.tipo);
      fd.set("titulo", data.titulo);
      fd.set("descricao", data.descricao ?? "");
      fd.set("copy", data.copy ?? "");
      fd.set("hashtags", data.hashtags.join(" "));
      fd.set("status", data.status);
      fd.set("estilo", data.estilo ?? "");
      fd.set("responsavel_id", data.responsavelId || "");
      const editId = editing.id;
      startTransition(async () => {
        const res = await atualizarEntradaAction(editId, fd);
        if (res && "error" in res && res.error) {
          setError(res.error);
        } else if (res && "ok" in res && res.ok && res.entrada) {
          // Substitui a entrada editada no estado local — sem recarregar.
          setLista((prev) => prev.map((it) => (it.id === editId ? (res.entrada as PlanejamentoEntrada) : it)));
          setDiaSelecionado(res.entrada.data);
          setEditing(null);
          setError(null);
          toast.success("Entrada atualizada");
        }
      });
    }
  }

  function handleDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    startTransition(async () => {
      await deletarEntradaAction(id);
      // Remove localmente — sem recarregar.
      setLista((prev) => prev.filter((it) => it.id !== id));
      setConfirmDelete(null);
      setEditing(null);
      toast.success("Entrada excluída");
    });
  }

  function handleStartPlan() {
    const fd = new FormData();
    fd.set("cliente_id", clienteId);
    fd.set("mes_referencia", mesReferencia);
    startTransition(async () => {
      await criarPlanejamentoAction(fd);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-slate-400">
          {lista.length === 0
            ? canEdit
              ? "Clique em uma data para criar a primeira entrada."
              : "Sem entradas neste mês."
            : `${lista.length} entrada(s) programada(s).`}
        </p>
        {canEdit && planejamentoId && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing("new");
              setDefaultDate(diaSelecionado ?? mesReferencia);
            }}
            iconLeft={<CalendarPlus className="h-4 w-4" />}
          >
            Nova entrada
          </Button>
        )}
      </div>

      {!planejamentoId && canEdit ? (
        <Card>
          <p className="text-sm text-slate-300 mb-3">
            Você ainda não tem um planejamento para <strong>{mesLabel}</strong>. Comece criando o
            planejamento do mês — depois você adiciona as entradas.
          </p>
          <Button onClick={handleStartPlan} loading={pending} iconLeft={<CalendarPlus className="h-4 w-4" />}>
            Iniciar planejamento de {mesLabel}
          </Button>
        </Card>
      ) : (
        <>
          {canEdit && planejamentoId && (
            <div className="mb-3 rounded-lg border border-border bg-bg-surface px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Dias de postagem
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {DIAS_SEMANA.map(({ d, l }) => {
                    const ativo = dias.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleToggleDia(d)}
                        disabled={pending}
                        aria-pressed={ativo}
                        className={cn(
                          "text-xs font-medium px-2.5 py-1 rounded-md border transition disabled:opacity-50",
                          ativo
                            ? "bg-royal-500/15 border-royal-500/40 text-royal-200"
                            : "bg-bg-elevated border-border text-slate-400 hover:text-slate-200 hover:border-royal-500/30"
                        )}
                        title={ativo ? "Remover dia de postagem" : "Marcar como dia de postagem"}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-slate-500">
                  Os dias marcados ficam levemente coloridos no calendário.
                </span>
              </div>
            </div>
          )}

          <EditorialCalendar
            entries={lista}
            initialDate={mesReferencia}
            onCellClick={handleCellClick}
            onEntryClick={handleEntryClick}
            selectedDate={diaSelecionado}
            diasPostagem={dias}
          />
        </>
      )}

      {/* Lista detalhada (todas entradas do mês) */}
      {planejamentoId && lista.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Todas as entradas de {mesLabel}</h3>
            <Badge variant="default">{lista.length}</Badge>
          </div>
          <ul className="divide-y divide-border">
            {lista.map((e) => {
              const st = ENTRY_STATUS[e.status];
              const corTipo = ENTRY_TIPO_COR[e.tipo as EntradaTipo] ?? ENTRY_TIPO_COR.post_feed;
              const respNome = membros?.find((m) => m.id === e.responsavel_id)?.nome;
              return (
                <li key={e.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={cn(
                            "inline-block h-3 w-3 rounded-full border border-white/20 shrink-0",
                            corTipo.dot
                          )}
                          title={`${ENTRY_TIPO_LABEL[e.tipo as EntradaTipo] ?? e.tipo}`}
                        />
                        <p className="font-medium text-slate-100">{e.titulo}</p>
                        <Badge variant="brand">{ENTRY_TIPO_LABEL[e.tipo as EntradaTipo] ?? e.tipo}</Badge>
                        {e.estilo && (
                          <span className="text-[10px] text-slate-400 italic">{e.estilo}</span>
                        )}
                        {respNome && (
                          <span className="text-[10px] text-royal-300/80 inline-flex items-center gap-1">
                            · Resp.: {respNome}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">{formatDate(e.data)}</span>
                        <Badge
                          variant="default"
                          className={`!text-[10px] !px-1.5 !py-0 ${
                            e.status === "alteracao_solicitada"
                              ? "!bg-warning-500/15 !text-warning-300 !border-warning-500/30"
                              : e.status === "aprovado" || e.status === "publicado"
                              ? "!bg-success-500/15 !text-success-400 !border-success-500/30"
                              : e.status === "rejeitado"
                              ? "!bg-danger-500/15 !text-danger-400 !border-danger-500/30"
                              : ""
                          }`}
                        >
                          {st.label}
                        </Badge>
                      </div>
                      {e.copy && (
                        <p className="text-xs text-slate-400 line-clamp-2 mb-1">{e.copy}</p>
                      )}
                      {e.hashtags && e.hashtags.length > 0 && (
                        <p className="text-xs text-royal-300 line-clamp-1 mb-1">{e.hashtags.join(" ")}</p>
                      )}
                      {e.aprovacao_comentario && (
                        <div className="rounded-md bg-royal-500/10 border border-royal-500/30 px-2.5 py-1.5 mt-1.5 flex items-start gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-royal-300 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-200 whitespace-pre-wrap line-clamp-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-royal-200 mr-1">
                              Cliente:
                            </span>
                            {e.aprovacao_comentario}
                          </p>
                        </div>
                      )}
                      {canEdit && (
                        <div className="flex items-center gap-1 mt-2">
                          {e.status === "alteracao_solicitada" && (
                            <button
                              type="button"
                              onClick={() => handleAdminStatus(e, "aprovado")}
                              disabled={pending}
                              className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded bg-success-500/10 hover:bg-success-500/20 text-success-300 border border-success-500/30"
                            >
                              <Check className="h-3 w-3" /> Aprovar correção
                            </button>
                          )}
                          {(e.status === "rejeitado" || e.status === "alteracao_solicitada") && (
                            <button
                              type="button"
                              onClick={() => handleAdminStatus(e, "pendente")}
                              disabled={pending}
                              className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded bg-bg-elevated hover:bg-bg-elevated/70 text-slate-300 border border-border"
                            >
                              <RotateCcw className="h-3 w-3" /> Voltar para pendente
                            </button>
                          )}
                          {e.status === "pendente" && (
                            <button
                              type="button"
                              onClick={() => handleAdminStatus(e, "aprovado")}
                              disabled={pending}
                              className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded bg-success-500/10 hover:bg-success-500/20 text-success-300 border border-success-500/30"
                            >
                              <Check className="h-3 w-3" /> Marcar como aprovado
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEntryClick(e)}
                          className="p-1.5 rounded text-slate-400 hover:text-royal-300 hover:bg-royal-500/10"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(e)}
                          className="p-1.5 rounded text-slate-400 hover:text-danger-400 hover:bg-danger-500/10"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Modal de edição/criação */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
          onClick={() => !pending && setEditing(null)}
        >
          <div
            className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100">
                {editing === "new" ? "Nova entrada" : "Editar entrada"}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-bg-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && (
              <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2 mb-3">
                {error}
              </p>
            )}
            <EntryEditor
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? undefined : editing}
              defaultDate={defaultDate}
              membros={membros}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
              onDelete={
                editing !== "new"
                  ? async () => {
                      setConfirmDelete(editing);
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
          onClick={() => !pending && setConfirmDelete(null)}
        >
          <div
            className="card max-w-md w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-base font-semibold text-slate-100">Excluir entrada?</h3>
            <p className="text-sm text-slate-400 mt-2">
              Tem certeza que deseja excluir <strong>"{confirmDelete.titulo}"</strong>? Essa ação não
              pode ser desfeita.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={pending}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
