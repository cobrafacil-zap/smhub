"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Sparkles, FileText } from "lucide-react";
import {
  criarContratoAction,
  type CriarContratoState,
} from "@/lib/actions/contrato-actions";
import { toast } from "@/components/ui/Toast";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} iconLeft={<Sparkles className="h-4 w-4" />}>
      Gerar contrato
    </Button>
  );
}

export function GeradorForm({
  clientes,
  templates,
  defaultTemplateId,
}: {
  clientes: { id: string; nome_empresa: string; nome_responsavel: string }[];
  templates: { id: string; nome: string }[];
  defaultTemplateId?: string;
}) {
  const router = useRouter();
  const [state, action] = useFormState<CriarContratoState, FormData>(
    criarContratoAction,
    undefined
  );

  // Redireciona quando o contrato for criado com sucesso
  useEffect(() => {
    if (state && "ok" in state && state.ok && state.id) {
      toast.success("Contrato gerado!");
      router.push(`/admin/contratos/${state.id}`);
    }
  }, [state, router]);

  return (
    <>
      <Card>
        <form action={action} className="space-y-4">
          {state && "error" in state && state.error && (
            <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
          <div>
            <label className="label">Template *</label>
            <Select name="template_id" defaultValue={defaultTemplateId ?? ""} required>
              <option value="">Selecione um template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
            {templates.length === 0 && (
              <p className="text-xs text-warning-400 mt-1">
                Você ainda não tem templates. Crie um em{" "}
                <a href="/admin/contratos/templates" className="underline">Templates</a>.
              </p>
            )}
          </div>
          <div>
            <label className="label">Cliente *</label>
            <Select name="cliente_id" required>
              <option value="">Selecione um cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_empresa} — {c.nome_responsavel}
                </option>
              ))}
            </Select>
            {clientes.length === 0 && (
              <p className="text-xs text-warning-400 mt-1">
                Cadastre um cliente ativo em <a href="/admin/clientes" className="underline">Clientes</a>.
              </p>
            )}
          </div>
          <div>
            <label className="label">Título do contrato *</label>
            <Input
              name="titulo"
              required
              placeholder="Ex: Contrato Mensal — Cliente X (2026)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor mensal (R$) *</label>
              <Input
                name="valor_mensal"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="label">Dia de vencimento</label>
              <Input
                name="dia_vencimento"
                type="number"
                min="1"
                max="31"
                defaultValue="10"
              />
            </div>
            <div>
              <label className="label">Duração (meses) *</label>
              <Input
                name="duracao_meses"
                type="number"
                min="1"
                max="120"
                required
                defaultValue="12"
              />
            </div>
            <div>
              <label className="label">Data de início *</label>
              <Input
                name="data_inicio"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <SubmitButton />
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-royal-300" />
          Como funciona
        </h3>
        <ol className="text-sm text-slate-400 space-y-1 list-decimal pl-5">
          <li>Escolha um template e preencha os dados do contrato.</li>
          <li>O sistema gera o contrato substituindo os placeholders pelos valores.</li>
          <li>Edite o conteúdo se quiser, depois envie para o cliente.</li>
          <li>O cliente assina digitalmente pelo portal; o hash é gerado e armazenado.</li>
        </ol>
      </Card>
    </>
  );
}
