"use client";

import { useEffect, useState } from "react";
import { Smartphone, Apple, Share, MoreVertical, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Botão exibido no rodapé dos dashboards para o usuário adicionar
 * o app à tela inicial do celular. Abre um modal com duas opções de
 * plataforma (iPhone / Android) e as instruções de cada uma.
 *
 * Em Android/Chrome, quando o navegador dispara `beforeinstallprompt`,
 * a opção Android usa o prompt nativo de instalação. Caso contrário,
 * mostra o passo a passo manual. Em iPhone (Safari) não há prompt
 * nativo — só o tutorial.
 *
 * Não renderiza nada quando o app já está em modo standalone (já
 * instalado) ou fora do navegador.
 */
type Platform = "iphone" | "android" | null;

export function AddToHomeScreen() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [standalone, setStandalone] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Já está instalado (rodando como app standalone)?
    const standaloneCheck =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (standaloneCheck) {
      setStandalone(true);
      return;
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  // Fecha com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Trava o scroll do body quando o modal está aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (standalone || installed) return null;

  async function instalarAndroid() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      /* ignore */
    }
    setDeferredPrompt(null);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full flex items-center justify-center gap-2 rounded-lg border border-royal-500/30 bg-gradient-to-r from-royal-500/10 to-bg-surface px-4 py-3 text-sm font-medium text-slate-200 hover:border-royal-500/60 hover:from-royal-500/20 transition"
      >
        <Smartphone className="h-4 w-4 text-royal-300" />
        Adicionar à tela do celular
        <span className="text-xs text-slate-500 group-hover:text-royal-300/80 hidden sm:inline">
          · iPhone e Android
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 animate-fade-in"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Adicionar à tela inicial"
        >
          <div
            className="card max-w-md w-full rounded-t-2xl sm:rounded-2xl animate-scale-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-bg-surface/95 backdrop-blur z-10">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-royal-300" />
                <h3 className="text-base font-semibold text-slate-100">
                  Adicionar à tela inicial
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-bg-elevated transition"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {platform === null ? (
              <div className="p-4 space-y-3">
                <p className="text-sm text-slate-400">
                  Escolha o seu celular para ver como instalar o app na tela
                  inicial:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlatform("iphone")}
                    className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border border-border bg-bg-elevated/30 hover:border-royal-500/50 hover:bg-bg-elevated transition text-center"
                  >
                    <Apple className="h-7 w-7 text-slate-200" />
                    <span className="text-sm font-medium text-slate-100">
                      iPhone
                    </span>
                    <span className="text-[11px] text-slate-500">Safari</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform("android")}
                    className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg border border-border bg-bg-elevated/30 hover:border-royal-500/50 hover:bg-bg-elevated transition text-center"
                  >
                    <Smartphone className="h-7 w-7 text-slate-200" />
                    <span className="text-sm font-medium text-slate-100">
                      Android
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Chrome / Edge
                    </span>
                  </button>
                </div>
              </div>
            ) : platform === "iphone" ? (
              <div className="p-4 space-y-4">
                <InstrucaoHeader
                  icon={<Apple className="h-5 w-5" />}
                  titulo="No iPhone (Safari)"
                  onVoltar={() => setPlatform(null)}
                />
                <ol className="space-y-3">
                  <Passo n={1}>
                    Abra a página no app <strong>Safari</strong> (não funciona no
                    Chrome do iPhone).
                  </Passo>
                  <Passo n={2}>
                    Toque no botão <strong>Compartilhar</strong> na barra
                    inferior.
                    <IconLinha>
                      <Share className="h-4 w-4 text-royal-300" />
                      <span>ícone de compartilhar (quadrado com seta)</span>
                    </IconLinha>
                  </Passo>
                  <Passo n={3}>
                    Role a lista e toque em{" "}
                    <strong>“Adicionar à Tela de Início”</strong>.
                  </Passo>
                  <Passo n={4}>
                    Confirme em <strong>“Adicionar”</strong>. O ícone do app
                    aparecerá na tela inicial.
                  </Passo>
                </ol>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPlatform(null)}
                  className="w-full"
                >
                  Voltar
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <InstrucaoHeader
                  icon={<Smartphone className="h-5 w-5" />}
                  titulo="No Android (Chrome / Edge)"
                  onVoltar={() => setPlatform(null)}
                />

                {deferredPrompt ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400">
                      Seu navegador já detectou o app. Toque abaixo para
                      instalar:
                    </p>
                    <Button
                      variant="primary"
                      onClick={instalarAndroid}
                      iconLeft={<Plus className="h-4 w-4" />}
                      className="w-full"
                    >
                      Instalar app
                    </Button>
                  </div>
                ) : (
                  <ol className="space-y-3">
                    <Passo n={1}>
                      Abra a página no <strong>Chrome</strong> ou{" "}
                      <strong>Edge</strong>.
                    </Passo>
                    <Passo n={2}>
                      Toque no menu <strong>⋮</strong> no canto superior
                      direito.
                      <IconLinha>
                        <MoreVertical className="h-4 w-4 text-royal-300" />
                        <span>três pontinhos</span>
                      </IconLinha>
                    </Passo>
                    <Passo n={3}>
                      Toque em <strong>“Adicionar à tela inicial”</strong>.
                    </Passo>
                    <Passo n={4}>
                      Confirme em <strong>“Adicionar”</strong>. O ícone do app
                      aparecerá na tela inicial.
                    </Passo>
                  </ol>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPlatform(null)}
                  className="w-full"
                >
                  Voltar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function InstrucaoHeader({
  icon,
  titulo,
  onVoltar,
}: {
  icon: React.ReactNode;
  titulo: string;
  onVoltar: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-slate-100">
      <button
        type="button"
        onClick={onVoltar}
        className="text-slate-400 hover:text-slate-200 text-xs"
      >
        ← Voltar
      </button>
      <span className="flex items-center gap-2 font-semibold">
        <span className="text-royal-300">{icon}</span>
        {titulo}
      </span>
    </div>
  );
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-royal-500/15 border border-royal-500/30 text-royal-300 text-xs font-semibold flex items-center justify-center">
        {n}
      </span>
      <span className="text-sm text-slate-300 leading-relaxed pt-0.5">
        {children}
      </span>
    </li>
  );
}

function IconLinha({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
      {children}
    </span>
  );
}