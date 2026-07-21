"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Instagram, Facebook, Plug, Unplug, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  iniciarMetaOAuthAction,
  desconectarMetaOAuthAction,
  selecionarContaMetaAction,
  cancelarSelecaoMetaAction,
} from "@/lib/actions/meta-actions";
import type { ConexaoRede, MetaProvider } from "@/types/database";

/** Contas disponíveis para o seletor pós-OAuth (sem token — seguro p/ client). */
export type ContaMetaSelecao = {
  provider?: MetaProvider;
  contas: { pageId: string; pageName: string; igUserId: string | null; igUsername: string | null }[];
  erro?: string;
};

/**
 * Permite ao admin conectar/desconectar Instagram e Facebook (Meta Graph API)
 * para o cliente. Após o OAuth, o callback guarda o token num cookie cifrado e
 * redireciona pra cá com `contasParaSelecionar` preenchido — o admin escolhe
 * qual Página/Instagram conectar. Depois de conectado, o botão "Importar
 * métricas" no formulário de relatório puxa as métricas da conta.
 */
export function ConectarRedesSociais({
  clienteId,
  conexoes,
  contasParaSelecionar,
}: {
  clienteId: string;
  conexoes: ConexaoRede[];
  contasParaSelecionar: ContaMetaSelecao | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyProvider, setBusyProvider] = useState<MetaProvider | null>(null);
  const [selecionada, setSelecionada] = useState<string | null>(null);

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

  /** Remove o param meta_select da URL (depois de confirmar/cancelar a seleção). */
  function limparParamSelecao() {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    u.searchParams.delete("meta_select");
    router.replace(u.pathname + u.search);
    router.refresh();
  }

  function confirmarSelecao() {
    if (!selecionada) {
      toast.error("Selecione uma conta.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("page_id", selecionada);
      const res = await selecionarContaMetaAction(fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Conta conectada com sucesso.");
      limparParamSelecao();
    });
  }

  function cancelarSelecao() {
    startTransition(async () => {
      await cancelarSelecaoMetaAction();
      limparParamSelecao();
    });
  }

  const sel = contasParaSelecionar;
  const selProvider = sel?.provider;
  const selLabel =
    selProvider === "instagram" ? "Instagram" : selProvider === "facebook" ? "Facebook" : "conta";
  // No fluxo de Instagram, só faz sentido conectar Páginas com conta IG vinculada.
  const contasVisiveis =
    sel && selProvider === "instagram"
      ? sel.contas.filter((c) => c.igUserId)
      : sel?.contas ?? [];

  return (
    <div className="space-y-4">
      {/* Seletor pós-OAuth: escolhe qual Página/Instagram conectar */}
      {sel && (
        <Card className="border-royal-500/40">
          <div className="flex items-center gap-2 mb-3">
            <Plug className="h-4 w-4 text-royal-300" />
            <h3 className="text-base font-semibold text-slate-100">
              Selecionar {selLabel}
            </h3>
          </div>

          {sel.erro ? (
            <div className="flex items-start gap-2 text-sm text-danger-300 bg-danger-500/10 border border-danger-500/30 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{sel.erro}</span>
            </div>
          ) : contasVisiveis.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                {selProvider === "instagram"
                  ? "Nenhuma Página com conta comercial do Instagram vinculada foi encontrada. Vincule uma conta comercial do Instagram a uma das suas Páginas do Facebook e tente de novo."
                  : "Nenhuma Página do Facebook encontrada para esta conta."}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-400 mb-3">
                Escolha qual {selProvider === "instagram" ? "conta do Instagram" : "Página do Facebook"} conectar a este cliente.
              </p>
              <div className="space-y-2">
                {contasVisiveis.map((c) => {
                  const checked = selecionada === c.pageId;
                  return (
                    <label
                      key={c.pageId}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
                        checked
                          ? "border-royal-500/60 bg-royal-500/10"
                          : "border-border bg-bg-elevated/40 hover:border-royal-500/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="conta_meta"
                        value={c.pageId}
                        checked={checked}
                        onChange={() => setSelecionada(c.pageId)}
                        className="h-4 w-4 accent-royal-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-100 truncate">
                          {c.pageName}
                        </p>
                        {selProvider === "instagram" && c.igUsername && (
                          <p className="text-xs text-slate-400 truncate">
                            Instagram @{c.igUsername}
                          </p>
                        )}
                        {selProvider === "instagram" && !c.igUsername && (
                          <p className="text-xs text-slate-500 truncate">
                            Instagram vinculado (sem handle)
                          </p>
                        )}
                      </div>
                      {checked && (
                        <CheckCircle2 className="h-4 w-4 text-royal-300 shrink-0" />
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border">
            <Button
              size="sm"
              variant="secondary"
              loading={pending}
              onClick={cancelarSelecao}
            >
              Cancelar
            </Button>
            {!sel.erro && contasVisiveis.length > 0 && (
              <Button
                size="sm"
                loading={pending}
                disabled={!selecionada}
                onClick={confirmarSelecao}
                iconLeft={<Plug className="h-3.5 w-3.5" />}
              >
                Conectar esta conta
              </Button>
            )}
          </div>
        </Card>
      )}

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
    </div>
  );
}