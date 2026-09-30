"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MessageCircle, QrCode, PlugZap, Unplug, RefreshCw, Save } from "lucide-react";
import {
  salvarWhatsappConexaoAction,
  criarWhatsappInstanciaAction,
  gerarWhatsappQrAction,
  verificarWhatsappStatusAction,
  desconectarWhatsappAction,
} from "@/lib/actions/whatsapp-actions";
import { toast } from "@/components/ui/Toast";

export interface WhatsappConexaoResumo {
  api_url: string;
  instance: string;
  status: string;
  connected_at: string | null;
}

/** Conexão WhatsApp (Evolution dedicada) da agência — criar, parear QR, status. */
export function WhatsappConexaoCard({ initial }: { initial: WhatsappConexaoResumo | null }) {
  const [apiUrl, setApiUrl] = useState(initial?.api_url ?? "");
  const [instance, setInstance] = useState(initial?.instance ?? "");
  const [apiKey, setApiKey] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState(initial?.status ?? "desconectado");
  const [pending, start] = useTransition();

  const conectado = status === "conectado" || status === "open";

  function run(fn: () => Promise<{ error?: string; ok?: boolean } | { ok: boolean; state?: string } | { ok: boolean; qr: string | null }>, okMsg?: string) {
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if (okMsg) toast.success(okMsg);
    });
  }

  function onSalvar() {
    const fd = new FormData();
    fd.set("api_url", apiUrl.trim());
    fd.set("instance", instance.trim());
    fd.set("api_key", apiKey);
    run(() => salvarWhatsappConexaoAction(fd), "Conexão salva!");
  }

  function onCriar() {
    run(() => criarWhatsappInstanciaAction().then((r) => {
      if (!("error" in r && r.error)) setStatus("connecting");
      return r;
    }), "Instância criada! Gere o QR para parear.");
  }

  function onQr() {
    start(async () => {
      const res = await gerarWhatsappQrAction();
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if ("qr" in res && res.qr) {
        setQr(res.qr.startsWith("data:") ? res.qr : `data:image/png;base64,${res.qr}`);
      } else {
        toast.success("Instância já conectada — sem QR pendente.");
      }
    });
  }

  function onVerificar() {
    start(async () => {
      const res = await verificarWhatsappStatusAction();
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if ("state" in res && res.state) {
        setStatus(res.state === "open" ? "conectado" : res.state);
        toast.success(res.state === "open" ? "WhatsApp conectado!" : `Status: ${res.state}`);
      }
    });
  }

  function onDesconectar() {
    run(() => desconectarWhatsappAction().then((r) => {
      if (!("error" in r && r.error)) {
        setStatus("desconectado");
        setQr(null);
      }
      return r;
    }), "Desconectado.");
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-royal-300" />
          WhatsApp
        </h3>
        <Badge variant={conectado ? "success" : "warning"}>
          {conectado ? "Conectado" : status}
        </Badge>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Instância Evolution <span className="text-slate-200 font-medium">exclusiva da sua agência</span>.
        Crie a instância, escaneie o QR com o WhatsApp e envie relatórios com IA para o grupo de cada cliente.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="label">URL da Evolution API</label>
          <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://evolution.suaagencia.com" />
        </div>
        <div>
          <label className="label">Nome da instância</label>
          <Input value={instance} onChange={(e) => setInstance(e.target.value)} placeholder="minha-agencia" />
        </div>
        <div>
          <label className="label">API key {!initial && "*"}</label>
          <Input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            placeholder={initial ? "•••••• (preenchida — informe só p/ trocar)" : "Chave do servidor Evolution"}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={onSalvar} loading={pending} iconLeft={<Save className="h-4 w-4" />}>
          Salvar
        </Button>
        <Button type="button" variant="secondary" onClick={onCriar} iconLeft={<PlugZap className="h-4 w-4" />}>
          Criar instância
        </Button>
        <Button type="button" variant="secondary" onClick={onQr} iconLeft={<QrCode className="h-4 w-4" />}>
          Gerar QR
        </Button>
        <Button type="button" variant="ghost" onClick={onVerificar} iconLeft={<RefreshCw className="h-4 w-4" />}>
          Verificar status
        </Button>
        {conectado && (
          <Button type="button" variant="ghost" onClick={onDesconectar} iconLeft={<Unplug className="h-4 w-4" />}>
            Desconectar
          </Button>
        )}
      </div>
      {qr && (
        <div className="mt-4 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR de pareamento do WhatsApp" className="h-56 w-56 rounded-lg border border-border bg-white p-2" />
          <p className="text-xs text-slate-500">Escaneie com o WhatsApp → Aparelhos conectados.</p>
        </div>
      )}
    </Card>
  );
}
