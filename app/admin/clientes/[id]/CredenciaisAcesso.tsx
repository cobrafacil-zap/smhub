"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Plus, Trash2, Save, KeyRound, Pencil, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "@/components/ui/Toast";
import { atualizarClienteCredenciaisAction, type CredencialCliente } from "@/lib/actions/cliente-convite-actions";

export function CredenciaisAcesso({
  clienteId,
  initial,
}: {
  clienteId: string;
  initial: CredencialCliente[];
}) {
  const [items, setItems] = useState<CredencialCliente[]>(initial ?? []);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [pending, startTransition] = useTransition();

  function empty(): CredencialCliente {
    return { label: "", url: "", usuario: "", senha: "", observacao: "" };
  }

  function persist(next: CredencialCliente[]) {
    startTransition(async () => {
      const res = await atualizarClienteCredenciaisAction(clienteId, next);
      if (res?.error) toast.error(res.error);
      else toast.success("Credenciais salvas.");
    });
  }

  function salvar(idx: number | null, c: CredencialCliente) {
    if (!c.label.trim()) {
      toast.error("Informe pelo menos um nome/label para a credencial.");
      return;
    }
    const next = [...items];
    if (idx === null) next.push(c);
    else next[idx] = c;
    setItems(next);
    setAdding(false);
    setEditingIdx(null);
    persist(next);
  }

  function remover(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    setEditingIdx(null);
    persist(next);
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-royal-300" />
          Credenciais e acessos
        </h3>
        {!adding && editingIdx === null && (
          <Button size="sm" onClick={() => setAdding(true)} iconLeft={<Plus className="h-3.5 w-3.5" />}>
            Adicionar credencial
          </Button>
        )}
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Armazene logins, senhas e links de painéis do cliente. Esses dados ficam visíveis apenas
        para a sua agência.
      </p>

      {/* Form de adicionar */}
      {adding && (
        <CredencialForm
          initial={empty()}
          onCancel={() => setAdding(false)}
          onSave={(c) => salvar(null, c)}
          onDelete={null}
        />
      )}

      {/* Lista */}
      <div className="space-y-2">
        {items.length === 0 && !adding && (
          <p className="text-sm text-slate-500 italic">
            Nenhuma credencial cadastrada. Use o botão acima para guardar acessos do cliente.
          </p>
        )}
        {items.map((c, idx) =>
          editingIdx === idx ? (
            <CredencialForm
              key={idx}
              initial={c}
              onCancel={() => setEditingIdx(null)}
              onSave={(next) => salvar(idx, next)}
              onDelete={() => remover(idx)}
            />
          ) : (
            <div
              key={idx}
              className="rounded-lg border border-border bg-bg-elevated/40 p-3 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-100 text-sm">{c.label}</p>
                  {c.url && (
                    <a
                      href={c.url.startsWith("http") ? c.url : `https://${c.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-royal-300 hover:underline truncate max-w-[200px]"
                    >
                      {c.url}
                    </a>
                  )}
                </div>
                {(c.usuario || c.senha) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
                    {c.usuario && (
                      <div>
                        <p className="text-slate-500">Usuário</p>
                        <p className="text-slate-200 font-mono">{c.usuario}</p>
                      </div>
                    )}
                    {c.senha && (
                      <div>
                        <p className="text-slate-500">Senha</p>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-200 font-mono">
                            {revealed[idx] ? c.senha : "••••••••"}
                          </p>
                          <button
                            type="button"
                            onClick={() => setRevealed({ ...revealed, [idx]: !revealed[idx] })}
                            className="p-1 rounded text-slate-400 hover:text-slate-100"
                            title={revealed[idx] ? "Ocultar" : "Mostrar"}
                          >
                            {revealed[idx] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {c.observacao && (
                  <p className="text-xs text-slate-500 mt-2 italic">{c.observacao}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingIdx(idx)}
                  className="p-1.5 rounded text-slate-400 hover:text-royal-300 hover:bg-royal-500/10"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Excluir credencial "${c.label}"?`)) remover(idx);
                  }}
                  className="p-1.5 rounded text-slate-400 hover:text-danger-300 hover:bg-danger-500/10"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        )}
        {pending && (
          <p className="text-xs text-slate-500">Salvando...</p>
        )}
      </div>
    </Card>
  );
}

function CredencialForm({
  initial,
  onCancel,
  onSave,
  onDelete,
}: {
  initial: CredencialCliente;
  onCancel: () => void;
  onSave: (c: CredencialCliente) => void;
  onDelete: (() => void) | null;
}) {
  const [data, setData] = useState<CredencialCliente>(initial);
  return (
    <div className="rounded-lg border border-royal-500/30 bg-royal-500/5 p-3 space-y-3 mb-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label text-xs">Nome / Label *</label>
          <Input
            value={data.label ?? ""}
            onChange={(e) => setData({ ...data, label: e.target.value })}
            placeholder="Ex: Instagram, Meta Business..."
            required
          />
        </div>
        <div>
          <label className="label text-xs">URL</label>
          <Input
            value={data.url ?? ""}
            onChange={(e) => setData({ ...data, url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="label text-xs">Usuário</label>
          <Input
            value={data.usuario ?? ""}
            onChange={(e) => setData({ ...data, usuario: e.target.value })}
            placeholder="usuario@email.com"
          />
        </div>
        <div>
          <label className="label text-xs">Senha</label>
          <Input
            type="text"
            value={data.senha ?? ""}
            onChange={(e) => setData({ ...data, senha: e.target.value })}
            placeholder="••••••••"
          />
        </div>
      </div>
      <div>
        <label className="label text-xs">Observação</label>
        <Textarea
          rows={2}
          value={data.observacao ?? ""}
          onChange={(e) => setData({ ...data, observacao: e.target.value })}
          placeholder="Anotações internas..."
        />
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
        {onDelete ? (
          <Button variant="danger" size="sm" onClick={onDelete} iconLeft={<Trash2 className="h-3.5 w-3.5" />}>
            Excluir
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} iconLeft={<X className="h-3.5 w-3.5" />}>
            Cancelar
          </Button>
          <Button size="sm" onClick={() => onSave(data)} iconLeft={<Save className="h-3.5 w-3.5" />}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
