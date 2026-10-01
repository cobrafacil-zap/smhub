"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Target, TrendingUp, Users, PiggyBank, Save, ChevronDown, ChevronUp } from "lucide-react";
import { salvarMetasMensaisAction } from "@/lib/actions/metas-actions";
import { formatBRL } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import type { MetaMensal } from "@/types/database";

function primeiroDiaDoMes(mes: string): string {
  return `${mes}-01`;
}

function pct(real: number, meta: number): number {
  if (meta <= 0) return real > 0 ? 100 : 0;
  return Math.min(200, Math.round((real / meta) * 100));
}

/** Barra previsto x realizado com cor por desempenho. */
function Progresso({
  label,
  valor,
  meta,
  formato,
}: {
  label: string;
  valor: number;
  meta: number;
  formato: (v: number) => string;
}) {
  const p = pct(valor, meta);
  const cor = p >= 100 ? "bg-success-500" : p >= 70 ? "bg-royal-500" : "bg-warning-500";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-xs text-slate-400">
          {formato(valor)} <span className="text-slate-500">/ {formato(meta)}</span>{" "}
          <span className={p >= 100 ? "text-success-400 font-semibold" : "text-slate-300 font-medium"}>{p}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cor}`}
          style={{ width: `${Math.min(100, p)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Planejamento mensal do cliente: define no início do mês o investimento
 * previsto e a meta de comissões; ao longo do mês atualiza o realizado
 * (investimento, comissões, leads) e mostra progresso + rendimento por lead.
 */
export function PlanejamentoMensalCard({
  clienteId,
  mesInicial,
  initial,
}: {
  clienteId: string;
  mesInicial: string; // YYYY-MM
  initial: MetaMensal | null;
}) {
  const [open, setOpen] = useState(true);
  const [mes, setMes] = useState(mesInicial);
  const [investPrevisto, setInvestPrevisto] = useState(String(initial?.investimento_previsto ?? ""));
  const [metaComissoes, setMetaComissoes] = useState(String(initial?.meta_comissoes ?? ""));
  const [investRealizado, setInvestRealizado] = useState(String(initial?.investimento_realizado ?? ""));
  const [comissoesRealizadas, setComissoesRealizadas] = useState(String(initial?.comissoes_realizadas ?? ""));
  const [leads, setLeads] = useState(String(initial?.leads_realizados ?? ""));
  const [obs, setObs] = useState(initial?.observacoes ?? "");
  const [pending, start] = useTransition();

  const num = (v: string) => {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return isFinite(n) && n >= 0 ? n : 0;
  };
  const invPrev = num(investPrevisto);
  const metaCom = num(metaComissoes);
  const invReal = num(investRealizado);
  const comReal = num(comissoesRealizadas);
  const leadsN = Math.floor(num(leads));
  const rendPorLead = leadsN > 0 ? comReal / leadsN : 0;
  const roi = invReal > 0 ? comReal / invReal : 0;

  function onSalvar() {
    const fd = new FormData();
    fd.set("cliente_id", clienteId);
    fd.set("mes", primeiroDiaDoMes(mes));
    fd.set("investimento_previsto", String(invPrev));
    fd.set("meta_comissoes", String(metaCom));
    fd.set("investimento_realizado", String(invReal));
    fd.set("comissoes_realizadas", String(comReal));
    fd.set("leads_realizados", String(leadsN));
    fd.set("observacoes", obs);
    start(async () => {
      const res = await salvarMetasMensaisAction(fd);
      if (res?.error) toast.error(res.error);
      else toast.success("Planejamento salvo!");
    });
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-royal-500/20 flex items-center justify-center">
            <Target className="h-4 w-4 text-royal-300" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-100">Planejamento mensal</p>
            <p className="text-xs text-slate-500">
              No início do mês: investimento previsto e meta de comissões. Depois: realizado.
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          <div className="flex items-end gap-2">
            <div className="w-40">
              <label className="label text-xs">Mês</label>
              <input
                type="month"
                className="input text-sm"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-500 pb-2.5">
              {initial && initial.mes.startsWith(mes) ? "Editando planejamento deste mês." : "Salva como novo planejamento deste mês."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <PiggyBank className="h-3 w-3" /> Previsto (início do mês)
              </p>
              <div>
                <label className="label text-xs">Investimento (R$)</label>
                <Input type="number" min="0" step="0.01" className="text-sm" value={investPrevisto} onChange={(e) => setInvestPrevisto(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="label text-xs">Meta de comissões (R$)</label>
                <Input type="number" min="0" step="0.01" className="text-sm" value={metaComissoes} onChange={(e) => setMetaComissoes(e.target.value)} placeholder="0,00" />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Realizado (até hoje)
              </p>
              <div>
                <label className="label text-xs">Investido (R$)</label>
                <Input type="number" min="0" step="0.01" className="text-sm" value={investRealizado} onChange={(e) => setInvestRealizado(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="label text-xs">Comissões (R$)</label>
                <Input type="number" min="0" step="0.01" className="text-sm" value={comissoesRealizadas} onChange={(e) => setComissoesRealizadas(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <label className="label text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Leads no mês</label>
                <Input type="number" min="0" className="text-sm" value={leads} onChange={(e) => setLeads(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Resultado</p>
              <div className="space-y-3 rounded-xl border border-border bg-bg-elevated/40 p-3">
                <Progresso label="Comissões" valor={comReal} meta={metaCom} formato={formatBRL} />
                <Progresso label="Investimento" valor={invReal} meta={invPrev} formato={formatBRL} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-bg-elevated/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Inv./lead</p>
                  <p className="text-sm font-bold text-warning-400">{leadsN > 0 && invReal > 0 ? formatBRL(invReal / leadsN) : "—"}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-elevated/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Rend./lead</p>
                  <p className="text-sm font-bold text-royal-300">{leadsN > 0 ? formatBRL(rendPorLead) : "—"}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-elevated/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">ROI</p>
                  <p className={`text-sm font-bold ${roi >= 1 ? "text-success-400" : "text-warning-400"}`}>
                    {invReal > 0 ? `${roi.toFixed(1).replace(".", ",")}x` : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-bg-elevated/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Leads</p>
                  <p className="text-sm font-bold text-slate-200">{leadsN > 0 ? leadsN : "—"}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="label text-xs">Observações</label>
            <Textarea
              className="text-sm min-h-[50px]"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ajustes de verba, sazonalidade, pendências..."
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={onSalvar} loading={pending} iconLeft={<Save className="h-4 w-4" />}>
              Salvar planejamento
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
