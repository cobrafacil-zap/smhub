"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { criarPlanejamentoAction } from "@/lib/actions/agencia-actions";
import { MONTHS_PT } from "@/lib/constants";
import { toast } from "sonner";
import type { Cliente } from "@/types/database";

export function NovoPlanejamentoForm({ clientes }: { clientes: Pick<Cliente, "id" | "nome_empresa" | "segmento">[] }) {
  const router = useRouter();
  const [clienteId, setClienteId] = useState("");
  const hoje = new Date();
  const [mes, setMes] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const clienteSelecionado = clientes.find((c) => c.id === clienteId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clienteId) {
      setError("Selecione um cliente.");
      return;
    }
    const fd = new FormData();
    fd.set("cliente_id", clienteId);
    fd.set("mes_referencia", `${mes}-01`);
    startTransition(async () => {
      const res = await criarPlanejamentoAction(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success("Planejamento criado! Agora adicione as entradas.");
      router.push(`/admin/clientes/${clienteId}?tab=planejamento&mes=${mes}`);
    });
  }

  const [ano, m] = mes.split("-").map(Number);
  const mesLabel = `${MONTHS_PT[m - 1]} ${ano}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Criar planejamento"
        description="Selecione o cliente e o mês de referência."
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/planejamentos", label: "Planejamentos" },
          { label: "Novo" },
        ]}
        actions={
          <Link href="/admin/planejamentos">
            <Button variant="ghost" iconLeft={<ArrowLeft className="h-4 w-4" />}>
              Voltar
            </Button>
          </Link>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-danger-400 mt-0.5 shrink-0" />
              <p className="text-sm text-danger-300">{error}</p>
            </div>
          )}

          <div>
            <label className="label">Cliente *</label>
            <select
              className="input"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              required
            >
              <option value="">— Selecione um cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_empresa}
                  {c.segmento ? ` • ${c.segmento}` : ""}
                </option>
              ))}
            </select>
            {clientes.length === 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                Nenhum cliente cadastrado.{" "}
                <Link href="/admin/clientes/novo" className="text-royal-300 hover:underline">
                  Cadastrar cliente
                </Link>
              </p>
            )}
          </div>

          <div>
            <label className="label">Mês de referência *</label>
            <input
              type="month"
              className="input"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              required
            />
          </div>

          {clienteSelecionado && (
            <div className="rounded-md bg-bg-elevated/40 border border-border px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success-400" />
              <p className="text-sm text-slate-300">
                Será criado o planejamento de <strong className="text-slate-100">{mesLabel}</strong>{" "}
                para <strong className="text-slate-100">{clienteSelecionado.nome_empresa}</strong>.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Link href="/admin/planejamentos">
              <Button type="button" variant="ghost">Cancelar</Button>
            </Link>
            <Button
              type="submit"
              loading={pending}
              disabled={!clienteId}
              iconLeft={<Plus className="h-4 w-4" />}
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              Criar e abrir
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
