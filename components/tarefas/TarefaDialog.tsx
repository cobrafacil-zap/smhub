"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Save, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import { criarTarefaAction, atualizarTarefaAction } from "@/lib/actions/tarefa-actions";
import { criarGrupoAction } from "@/lib/actions/grupo-actions";
import { LabelPicker } from "./LabelPicker";
import { ChecklistEditor, type Checklist } from "./ChecklistEditor";
import { AnexosEditor, type AnexoItem } from "./AnexosEditor";
import type { ClienteOption, MembroOption, TarefaGrupoOption, TarefaItem, LabelOption } from "@/app/admin/tarefas/page";
import type { TarefaColuna, TarefaQuadro } from "@/types/database";

const PRIORIDADE_OPCOES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export function TarefaDialog({
  open,
  tarefa,
  membros,
  clientes,
  quadros,
  grupos,
  colunas,
  colunaIdInicial,
  quadroIdInicial,
  labels,
  onClose,
}: {
  open: boolean;
  tarefa: TarefaItem | null; // null = criação
  membros: MembroOption[];
  clientes: ClienteOption[];
  quadros: TarefaQuadro[];
  grupos: TarefaGrupoOption[];
  colunas: TarefaColuna[];
  colunaIdInicial: string | null;
  quadroIdInicial: string;
  labels: LabelOption[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = !!tarefa;

  // Coluna inicial: a do `tarefa` (edição) ou a `colunaIdInicial` (criação
  // vinda do "+ Adicionar tarefa" do rodapé da coluna). Se nada vier,
  // usa a primeira coluna do quadro.
  const colunaInicialId =
    tarefa?.tarefa_coluna_id ?? colunaIdInicial ?? colunas[0]?.id ?? "";

  // Estado do agrupamento. O form serializa via name="grupo_id" — o
  // input hidden recebe o valor atual. Quando o usuário clica "Criar
  // novo" abrimos o modo inline; ao salvar, gravamos o id do grupo
  // criado nesse input.
  const [grupoId, setGrupoId] = useState<string>(tarefa?.grupo_id ?? "");
  const [criandoGrupo, setCriandoGrupo] = useState(false);
  const [novoGrupoNome, setNovoGrupoNome] = useState("");
  const [novoGrupoClienteId, setNovoGrupoClienteId] = useState<string>("");
  const [novoGrupoData, setNovoGrupoData] = useState<string>("");
  const [gruposLista, setGruposLista] = useState<TarefaGrupoOption[]>(grupos);
  // Mantém a lista em sync se o pai atualizar após criar grupo.
  useEffect(() => setGruposLista(grupos), [grupos]);

  // Estados das seções Trello (só em edição)
  const [labelsSelecionados, setLabelsSelecionados] = useState<string[]>(
    tarefa?.labels.map((l) => l.id) ?? []
  );
  const [checklists, setChecklists] = useState<Checklist[]>(
    (tarefa?.checklists ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      itens: c.itens,
    }))
  );
  const [anexos, setAnexos] = useState<AnexoItem[]>(tarefa?.anexos ?? []);

  useEffect(() => {
    if (open) {
      setError(null);
      setGrupoId(tarefa?.grupo_id ?? "");
      setCriandoGrupo(false);
      setNovoGrupoNome("");
      setNovoGrupoClienteId("");
      setNovoGrupoData("");
      setLabelsSelecionados(tarefa?.labels.map((l) => l.id) ?? []);
      setChecklists(
        (tarefa?.checklists ?? []).map((c) => ({
          id: c.id,
          nome: c.nome,
          itens: c.itens,
        }))
      );
      setAnexos(tarefa?.anexos ?? []);
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [open, tarefa?.grupo_id, tarefa]);

  function handleClose() {
    if (!pending) onClose();
  }

  async function handleCriarGrupo() {
    if (!novoGrupoNome.trim()) return;
    const fd = new FormData();
    // O quadro atual: prioriza o selecionado no form (se já trocou), senão
    // o da tarefa editada / inicial.
    const quadroSelecionado =
      (document.getElementById("tarefa-quadro-select") as HTMLSelectElement | null)?.value ||
      tarefa?.quadro_id ||
      quadroIdInicial;
    fd.set("quadro_id", quadroSelecionado);
    fd.set("nome", novoGrupoNome.trim());
    if (novoGrupoClienteId) fd.set("cliente_id", novoGrupoClienteId);
    if (novoGrupoData) fd.set("data_entrega", novoGrupoData);
    const res = await criarGrupoAction(undefined, fd);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    if (res?.id) {
      // Adiciona na lista local e seleciona.
      setGruposLista((prev) => [
        ...prev,
        {
          id: res.id!,
          nome: res.nome ?? novoGrupoNome.trim(),
          cliente_id: novoGrupoClienteId || null,
          data_entrega: novoGrupoData || null,
          manual: true,
        },
      ]);
      setGrupoId(res.id);
      setCriandoGrupo(false);
      setNovoGrupoNome("");
      setNovoGrupoClienteId("");
      setNovoGrupoData("");
      toast.success("Agrupamento criado.");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Anexa os IDs dos labels selecionados (a action usa getAll("label_ids"))
    formData.delete("label_ids");
    for (const id of labelsSelecionados) formData.append("label_ids", id);
    startTransition(async () => {
      const res = editing
        ? await atualizarTarefaAction(tarefa!.id, formData)
        : await criarTarefaAction(undefined, formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <dialog
      ref={ref}
      onClose={handleClose}
      className={cn(
        "backdrop:bg-black/60 rounded-xl p-0 w-full max-w-lg text-slate-100",
        "bg-bg-surface border border-border shadow-xl"
      )}
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            {editing ? "Editar tarefa" : "Nova tarefa"}
          </h2>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-royal-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="label">Título</label>
          <Input
            name="titulo"
            required
            defaultValue={tarefa?.titulo ?? ""}
            placeholder="Ex.: Criar 3 reels do cliente X"
          />
        </div>

        <div className="space-y-1.5">
          <label className="label">Descrição</label>
          <Textarea
            name="descricao"
            defaultValue={tarefa?.descricao ?? ""}
            placeholder="Detalhes, escopo, referências…"
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Coluna</label>
            <Select name="tarefa_coluna_id" defaultValue={colunaInicialId}>
              {colunas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="label">Prioridade</label>
            <Select name="prioridade" defaultValue={tarefa?.prioridade ?? "media"}>
              {PRIORIDADE_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Prazo</label>
            <Input type="date" name="prazo" defaultValue={tarefa?.prazo ?? ""} />
          </div>
          <div className="space-y-1.5">
            <label className="label">Cliente (opcional)</label>
            <Select name="cliente_id" defaultValue={tarefa?.cliente_id ?? ""}>
              <option value="">— Nenhum —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_empresa}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="label">Quadro</label>
          <Select
            id="tarefa-quadro-select"
            name="quadro_id"
            defaultValue={tarefa?.quadro_id ?? quadroIdInicial}
          >
            {quadros.map((q) => (
              <option key={q.id} value={q.id}>
                {q.nome}
              </option>
            ))}
          </Select>
        </div>

        {/* Agrupamento (opcional). O valor é serializado como `grupo_id`
            via input hidden controlado por estado — assim o "Criar novo"
            pode gravar o id do grupo recém-criado. */}
        <div className="space-y-1.5">
          <label className="label flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Agrupamento (opcional)
          </label>
          <input type="hidden" name="grupo_id" value={grupoId} />
          <Select
            value={grupoId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__criar__") {
                setCriandoGrupo(true);
              } else {
                setGrupoId(v);
                setCriandoGrupo(false);
              }
            }}
            disabled={criandoGrupo}
          >
            <option value="">— Sem agrupamento —</option>
            {gruposLista.map((g) => (
              <option key={g.id} value={g.id}>
                {g.manual ? "📦 " : ""}{g.nome}
              </option>
            ))}
            <option value="__criar__">＋ Criar novo agrupamento…</option>
          </Select>
          {criandoGrupo && (
            <div className="rounded-lg border border-royal-500/30 bg-royal-500/[0.05] p-3 space-y-2">
              <Input
                value={novoGrupoNome}
                onChange={(e) => setNovoGrupoNome(e.target.value)}
                placeholder="Nome do agrupamento"
                maxLength={80}
                className="h-8 text-sm"
                autoFocus
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select
                  value={novoGrupoClienteId}
                  onChange={(e) => setNovoGrupoClienteId(e.target.value)}
                  className="text-sm"
                >
                  <option value="">— Sem cliente —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_empresa}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  value={novoGrupoData}
                  onChange={(e) => setNovoGrupoData(e.target.value)}
                  className="text-sm"
                  title="Data de entrega (opcional)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  iconLeft={<Plus className="h-3.5 w-3.5" />}
                  onClick={handleCriarGrupo}
                  disabled={!novoGrupoNome.trim() || pending}
                >
                  Criar e usar
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setCriandoGrupo(false);
                    setNovoGrupoNome("");
                    setNovoGrupoClienteId("");
                    setNovoGrupoData("");
                  }}
                  className="text-xs text-slate-400 hover:text-royal-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Multi-atribuição */}
        <div className="space-y-1.5">
          <label className="label">Responsáveis</label>
          <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 rounded-lg bg-bg-elevated border border-border">
            {membros.length === 0 && (
              <p className="col-span-2 text-xs text-slate-500 py-2 text-center">
                Nenhum membro ativo. Convide a equipe primeiro.
              </p>
            )}
            {membros.map((m) => {
              const checked = tarefa?.responsaveis.some((r) => r.id === m.id) ?? false;
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-royal-300"
                >
                  <input
                    type="checkbox"
                    name="responsaveis"
                    value={m.id}
                    defaultChecked={checked}
                    className="h-4 w-4 rounded border-border accent-royal-500"
                  />
                  <span className="truncate">
                    {m.nome}
                    {m.cargo ? <span className="text-slate-500"> · {m.cargo}</span> : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Etiquetas (Trello-style) */}
        <div className="space-y-1.5">
          <label className="label flex items-center gap-1.5">
            <Package className="h-3 w-3" /> Etiquetas
          </label>
          <LabelPicker
            opcoes={labels}
            selecionados={labelsSelecionados}
            onChange={setLabelsSelecionados}
            admin={true}
          />
          {/* Inputs hidden pra serializar no FormData */}
          {labelsSelecionados.map((id) => (
            <input key={id} type="hidden" name="label_ids" value={id} />
          ))}
        </div>

        {/* Checklists — só em edição (não dá pra criar sem ID) */}
        {editing && (
          <div className="space-y-1.5">
            <label className="label">Checklists</label>
            <ChecklistEditor
              tarefaId={tarefa!.id}
              checklists={checklists}
              onChange={setChecklists}
            />
          </div>
        )}

        {/* Anexos — só em edição */}
        {editing && (
          <div className="space-y-1.5">
            <AnexosEditor
              tarefaId={tarefa!.id}
              anexos={anexos}
              onChange={setAnexos}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" loading={pending} iconLeft={!pending ? <Save className="h-4 w-4" /> : undefined}>
            {pending ? "Salvando…" : editing ? "Salvar" : "Criar tarefa"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}