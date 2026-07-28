"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { Eye, EyeOff, Plus, Trash2, Save, Sparkles, Building2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LogoUpload } from "@/components/forms/LogoUpload";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { toast } from "@/components/ui/Toast";
import {
  atualizarMinhaFotoPerfilAction,
  atualizarMinhasPreferenciasAction,
  atualizarMinhaEmpresaAction,
  type ContaState,
} from "@/lib/actions/cliente-conta-actions";
import type { CredencialCliente } from "@/lib/actions/cliente-convite-actions";
import type { EmpresaReferencia } from "@/types/database";

// ---------------------------------------------------------------------------
// FOTO DE PERFIL
// ---------------------------------------------------------------------------
function FotoSubmit() {
  return <Button type="submit" iconLeft={<Save className="h-4 w-4" />}>Salvar foto</Button>;
}

export function FotoPerfilForm({ initialUrl }: { initialUrl: string | null }) {
  const [state, action] = useFormState<ContaState, FormData>(atualizarMinhaFotoPerfilAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <LogoUpload
        bucket={STORAGE_BUCKETS.client}
        pathPrefix="avatares"
        name="foto_perfil"
        initialUrl={initialUrl}
        label="Foto de perfil"
        hint="PNG, JPG, WebP ou SVG — máx 2 MB. Esta foto aparece no seu painel."
        previewClassName="rounded-full"
      />
      {state?.error && (
        <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          Foto salva.
        </p>
      )}
      <FotoSubmit />
    </form>
  );
}

// ---------------------------------------------------------------------------
// PREFERÊNCIAS — toggle de datas comemorativas
// ---------------------------------------------------------------------------
export function PreferenciasForm({ initialRecebe }: { initialRecebe: boolean }) {
  const [recebe, setRecebe] = useState(initialRecebe);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !recebe;
    setRecebe(next);
    startTransition(async () => {
      const res = await atualizarMinhasPreferenciasAction(next);
      if (res?.error) {
        toast.error(res.error);
        setRecebe(!next); // reverte em caso de erro
      } else {
        toast.success(next ? "Sugestões de datas ativadas." : "Sugestões de datas desativadas.");
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-100 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-royal-300" />
          Sugestões de datas comemorativas
        </p>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Quando ativado, mostramos datas comemorativas do mês no seu planejamento para você aceitar e
          virar postagem.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={recebe}
        onClick={toggle}
        disabled={pending}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
          recebe ? "bg-royal-500" : "bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            recebe ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// INFORMAÇÕES SOBRE MINHA EMPRESA — acessos (login/senha) + referências
// ---------------------------------------------------------------------------
function EmpresaSubmit() {
  return <Button type="submit" iconLeft={<Save className="h-4 w-4" />}>Salvar informações</Button>;
}

export function EmpresaInfoForm({
  initialCredenciais,
  initialReferencias,
}: {
  initialCredenciais: CredencialCliente[];
  initialReferencias: EmpresaReferencia[];
}) {
  const [state, action] = useFormState<ContaState, FormData>(atualizarMinhaEmpresaAction, undefined);
  const [creds, setCreds] = useState<CredencialCliente[]>(initialCredenciais ?? []);
  const [refs, setRefs] = useState<EmpresaReferencia[]>(initialReferencias ?? []);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  function updCred(i: number, patch: Partial<CredencialCliente>) {
    setCreds((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function updRef(i: number, patch: Partial<EmpresaReferencia>) {
    setRefs((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="credenciais" value={JSON.stringify(creds)} />
      <input type="hidden" name="empresas_referencia" value={JSON.stringify(refs)} />

      {/* Acessos (login/senha) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-100 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-royal-300" />
            Acessos (logins e senhas)
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setCreds((p) => [...p, { label: "", url: "", usuario: "", senha: "", observacao: "" }])}
            iconLeft={<Plus className="h-3.5 w-3.5" />}
          >
            Adicionar acesso
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          Compartilhe com sua agência os logins/senhas de redes sociais e painéis que ela precisa
          acessar. Estes dados ficam visíveis para você e para a sua agência.
        </p>

        {creds.length === 0 && (
          <p className="text-sm text-slate-500 italic">Nenhum acesso cadastrado.</p>
        )}

        <div className="space-y-2">
          {creds.map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-elevated/40 p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Nome (ex.: Instagram, Meta Business)"
                  value={c.label ?? ""}
                  onChange={(e) => updCred(i, { label: e.target.value })}
                />
                <Input
                  placeholder="URL (https://...)"
                  value={c.url ?? ""}
                  onChange={(e) => updCred(i, { url: e.target.value })}
                />
                <Input
                  placeholder="Usuário / e-mail"
                  value={c.usuario ?? ""}
                  onChange={(e) => updCred(i, { usuario: e.target.value })}
                />
                <div className="flex items-center gap-1">
                  <Input
                    type={revealed[i] ? "text" : "password"}
                    placeholder="Senha"
                    value={c.senha ?? ""}
                    onChange={(e) => updCred(i, { senha: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
                    className="p-2 rounded text-slate-400 hover:text-slate-100 shrink-0"
                    title={revealed[i] ? "Ocultar" : "Mostrar"}
                  >
                    {revealed[i] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Textarea
                rows={2}
                placeholder="Observação (opcional)"
                value={c.observacao ?? ""}
                onChange={(e) => updCred(i, { observacao: e.target.value })}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCreds((p) => p.filter((_, idx) => idx !== i))}
                  className="text-xs text-danger-400 hover:text-danger-300 inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empresas de referência */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-100 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-royal-300" />
            Empresas de referência
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setRefs((p) => [...p, { nome: "", url: "", motivo: "" }])}
            iconLeft={<Plus className="h-3.5 w-3.5" />}
          >
            Adicionar referência
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          Marcas que você admira e que servem de inspiração para a sua agência criar conteúdo.
        </p>

        {refs.length === 0 && (
          <p className="text-sm text-slate-500 italic">Nenhuma referência cadastrada.</p>
        )}

        <div className="space-y-2">
          {refs.map((r, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-elevated/40 p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Nome da empresa"
                  value={r.nome ?? ""}
                  onChange={(e) => updRef(i, { nome: e.target.value })}
                />
                <Input
                  placeholder="URL (https://...)"
                  value={r.url ?? ""}
                  onChange={(e) => updRef(i, { url: e.target.value })}
                />
              </div>
              <Textarea
                rows={2}
                placeholder="O que você gosta nela? (estilo, tom, conteúdo...)"
                value={r.motivo ?? ""}
                onChange={(e) => updRef(i, { motivo: e.target.value })}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setRefs((p) => p.filter((_, idx) => idx !== i))}
                  className="text-xs text-danger-400 hover:text-danger-300 inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          Informações salvas.
        </p>
      )}
      <div className="flex justify-end border-t border-border pt-4">
        <EmpresaSubmit />
      </div>
    </form>
  );
}