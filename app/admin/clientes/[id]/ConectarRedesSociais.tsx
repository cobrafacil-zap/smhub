"use client";

import { useState, useTransition } from "react";
import { Instagram, Facebook, Plug, Unplug } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  iniciarMetaOAuthAction,
  desconectarMetaOAuthAction,
} from "@/lib/actions/meta-actions";
import type { ConexaoRede, MetaProvider } from "@/types/database";

/**
 * Permite ao admin conectar/desconectar Instagram e Facebook (Meta Graph API)
 * para o cliente. Depois de conectado, o botão "Importar métricas" no
 * formulário de relatório passa a puxar as métricas da conta.
 */
export function ConectarRedesSociais({
  clienteId,
  conexoes,
}: {
  clienteId: string;
  conexoes: ConexaoRede[];
}) {
  const [pending, startTransition] = useTransition();
  const [busyProvider, setBusyProvider] = useState<MetaProvider | null>(null);

  const PROVIDERS: Array<{
    provider: MetaProvider;
    label: string;
    Icon: typeof Instagram;
  }> = [
    { provider: "instagram", label: "Instagram", Icon: Instagram },
    { provider: "facebook", label: "Facebook", Icon: Facebook },
  ];

  function conexaoOf(provider: MetaProvider): ConexaoRede | undefined {
    return conexoes.find((c) => c.provider === provider && c.connected_at);
  }

  function conectar(provider: MetaProvider) {
    setBusyProvider(provider);
    startTransition(async () => {
      try {
        const res = await iniciarMetaOAuthAction(clienteId, provider);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        // Redireciona o browser para o dialog da Meta
        window.location.href = res.url;
      } finally {
        setBusyProvider(null);
      }
    });
  }

  function desconectar(provider: MetaProvider) {
    setBusyProvider(provider);
    startTransition(async () => {
      try {
        const res = await desconectarMetaOAuthAction(clienteId, provider);
        if (res?.error) toast.error(res.error);
        else
          toast.success(
            `${provider === "instagram" ? "Instagram" : "Facebook"} desconectado.`
          );
      } finally {
        setBusyProvider(null);
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Plug className="h-4 w-4 text-royal-300" />
        <h3 className="text-base font-semibold text-slate-100">Redes sociais</h3>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Conecte o Instagram e o Facebook do cliente para puxar as métricas
        diretamente para os relatórios. Requer conta comercial do Instagram
        associada a uma Página do Facebook.
      </p>

      <div className="space-y-3">
        {PROVIDERS.map(({ provider, label, Icon }) => {
          const conn = conexaoOf(provider);
          const conectado = !!conn;
          return (
            <div
              key={provider}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-bg-elevated/40 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-slate-200" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100">{label}</p>
                    {conectado ? (
                      <Badge variant="success">Conectado</Badge>
                    ) : (
                      <Badge variant="default">Não conectado</Badge>
                    )}
                  </div>
                  {conectado ? (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {conn?.account_handle ? `@${conn.account_handle}` : conn?.account_name}
                      {conn?.connected_at
                        ? ` · em ${new Date(conn.connected_at).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Toque em conectar para autorizar.
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {conectado ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending && busyProvider === provider}
                    onClick={() => desconectar(provider)}
                    iconLeft={<Unplug className="h-3.5 w-3.5" />}
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    loading={pending && busyProvider === provider}
                    onClick={() => conectar(provider)}
                    iconLeft={<Plug className="h-3.5 w-3.5" />}
                  >
                    Conectar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}