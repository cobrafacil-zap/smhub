"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { criarClienteAction, type CriarClienteState } from "@/lib/actions/agencia-actions";
import { CLIENTE_SEGMENTOS } from "@/lib/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>Cadastrar cliente</Button>
  );
}

export default function NovoClientePage() {
  const [state, action] = useFormState<CriarClienteState, FormData>(
    criarClienteAction,
    undefined
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Novo cliente"
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/clientes", label: "Clientes" },
          { label: "Novo" },
        ]}
        actions={
          <Link href="/admin/clientes">
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />}>
              Voltar
            </Button>
          </Link>
        }
      />

      <Card>
        <form action={action} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nome da empresa *</label>
              <Input name="nome_empresa" required />
            </div>
            <div>
              <label className="label">Nome do responsável *</label>
              <Input name="nome_responsavel" required />
            </div>
            <div>
              <label className="label">E-mail</label>
              <Input name="email" type="email" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <Input name="telefone" />
            </div>
            <div>
              <label className="label">CNPJ/CPF</label>
              <Input name="cnpj_cpf" />
            </div>
            <div>
              <label className="label">Segmento *</label>
              <Select name="segmento" defaultValue="" required>
                <option value="" disabled>Selecione...</option>
                {CLIENTE_SEGMENTOS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="label">Valor mensal (R$)</label>
              <Input name="valor_mensal" type="number" step="0.01" min="0" />
            </div>
            <div>
              <label className="label">Dia de vencimento</label>
              <Input name="dia_vencimento" type="number" min="1" max="31" defaultValue="10" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Endereço</label>
              <Input name="endereco" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <Textarea name="observacoes" rows={3} />
            </div>
          </div>
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Link href="/admin/clientes">
              <Button type="button" variant="ghost">Cancelar</Button>
            </Link>
            <SubmitButton />
          </div>
        </form>
      </Card>
    </div>
  );
}
