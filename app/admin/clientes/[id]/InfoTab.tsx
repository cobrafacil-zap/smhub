"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { atualizarClienteAction } from "@/lib/actions/agencia-actions";
import { Save, Building2, KeyRound } from "lucide-react";
import type { Cliente } from "@/types/database";
import { toast } from "@/components/ui/Toast";
import { ConvidarClienteForm } from "@/components/clientes/ConvidarClienteForm";
import { CredenciaisAcesso } from "./CredenciaisAcesso";
import { ConectarRedesSociais } from "./ConectarRedesSociais";
import { CLIENTE_SEGMENTOS } from "@/lib/constants";
import type { ConexaoRede } from "@/types/database";

type MetaStatus =
  | { type: "connected" }
  | { type: "error"; message: string }
  | null;

export function InfoTab({
  cliente,
  conexoes,
  metaStatus,
}: {
  cliente: Cliente;
  conexoes: ConexaoRede[];
  metaStatus: MetaStatus;
}) {
  const [saving, setSaving] = useState(false);

  // Toast do resultado do OAuth callback (?meta=connected | ?meta_error=...).
  useEffect(() => {
    if (!metaStatus) return;
    if (metaStatus.type === "connected") {
      toast.success("Conta conectada com sucesso.");
    } else {
      toast.error(`Não foi possível conectar: ${metaStatus.message}`);
    }
    // Limpa o query param sem recarregar a página.
    if (typeof window !== "undefined" && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("meta");
      url.searchParams.delete("meta_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [metaStatus]);

  async function onSubmit(formData: FormData) {
    setSaving(true);
    const res = await atualizarClienteAction(cliente.id, formData);
    setSaving(false);
    if (res?.error) toast.error(res.error);
    else toast.success("Cliente atualizado!");
  }

  return (
    <>
    <Card>
      <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4">
        <Building2 className="h-4 w-4 text-royal-300" />
        Dados do cliente
      </h3>
      <form action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nome da empresa *</label>
            <Input name="nome_empresa" defaultValue={cliente.nome_empresa} required />
          </div>
          <div>
            <label className="label">Responsável *</label>
            <Input name="nome_responsavel" defaultValue={cliente.nome_responsavel} required />
          </div>
          <div>
            <label className="label">E-mail</label>
            <Input name="email" type="email" defaultValue={cliente.email ?? ""} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <Input name="telefone" defaultValue={cliente.telefone ?? ""} />
          </div>
          <div>
            <label className="label">CNPJ/CPF</label>
            <Input name="cnpj_cpf" defaultValue={cliente.cnpj_cpf ?? ""} />
          </div>
          <div>
            <label className="label">Segmento *</label>
            <Select name="segmento" defaultValue={cliente.segmento ?? ""} required>
              <option value="" disabled>Selecione...</option>
              {CLIENTE_SEGMENTOS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Status</label>
            <Select name="status" defaultValue={cliente.status}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="pausado">Pausado</option>
            </Select>
          </div>
          <div>
            <label className="label">Valor mensal (R$)</label>
            <Input
              name="valor_mensal"
              type="number"
              step="0.01"
              min="0"
              defaultValue={cliente.valor_mensal ?? ""}
            />
          </div>
          <div>
            <label className="label">Dia de vencimento</label>
            <Input
              name="dia_vencimento"
              type="number"
              min="1"
              max="31"
              defaultValue={cliente.dia_vencimento ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Endereço</label>
            <Input name="endereco" defaultValue={cliente.endereco ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observações</label>
            <Textarea name="observacoes" rows={3} defaultValue={cliente.observacoes ?? ""} />
          </div>
        </div>
        <div className="pt-3 border-t border-border flex justify-end">
          <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" />}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </Card>

    <CredenciaisAcesso
      clienteId={cliente.id}
      initial={(cliente.credenciais as unknown as Array<{ label: string; url?: string; usuario?: string; senha?: string; observacao?: string }> | null) ?? []}
    />

    <ConectarRedesSociais clienteId={cliente.id} conexoes={conexoes} />

    <Card>
      <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-1">
        <KeyRound className="h-4 w-4 text-royal-300" />
        Acesso ao portal do cliente
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        Gera login e senha para o cliente acessar <code className="text-royal-300">/cliente</code> e
        ver seus planejamentos, relatórios, contratos e faturas.
      </p>
      <ConvidarClienteForm
        clienteId={cliente.id}
        jaConvidado={Boolean(cliente.user_id)}
        jaTemEmail={Boolean(cliente.email)}
      />
    </Card>
    </>
  );
}
