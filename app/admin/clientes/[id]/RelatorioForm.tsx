"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BarChart3, Save, ChevronDown, ChevronUp, DownloadCloud } from "lucide-react";
import { criarRelatorioAction } from "@/lib/actions/agencia-actions";
import { importarMetricasAction } from "@/lib/actions/meta-actions";
import { toast } from "@/components/ui/Toast";
import { PLATAFORMAS_REDES } from "@/lib/constants";
import type { ConexaoRede, MetricasImportadas } from "@/types/database";

function mesAtualISO(): string {
  return new Date().toISOString().slice(0, 7);
}

export function RelatorioForm({
  clienteId,
  conexoes,
}: {
  clienteId: string;
  conexoes: ConexaoRede[];
}) {
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(mesAtualISO());
  const [plataforma, setPlataforma] = useState<typeof PLATAFORMAS_REDES[number]>("instagram");
  const [importando, startImport] = useTransition();
  const [importHint, setImportHint] = useState<string | null>(null);
  const [alcance, setAlcance] = useState("0");
  const [impressoes, setImpressoes] = useState("0");
  const [leads, setLeads] = useState("0");
  const [receita, setReceita] = useState("0");
  const [invest, setInvest] = useState("0");
  const [posts, setPosts] = useState("0");
  const [reels, setReels] = useState("0");
  const [stories, setStories] = useState("0");
  const [curtidas, setCurtidas] = useState("0");
  const [comentarios, setComentarios] = useState("0");
  const [mensagens, setMensagens] = useState("0");
  const [cliques, setCliques] = useState("0");
  const [seguindo, setSeguindo] = useState("0");
  const [seguidoresInicio, setSeguidoresInicio] = useState("0");
  const [seguidoresFim, setSeguidoresFim] = useState("0");
  const [observacoes, setObservacoes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const podeImportar =
    (plataforma === "instagram" || plataforma === "facebook") &&
    conexoes.some((c) => c.provider === plataforma && c.connected_at);

  // Campos que a importação da Meta NÃO puxa para Facebook (a API de Página
  // não expõe esses de forma limpa). Instagram puxa todos. Outras plataformas
  // continuam mostrando tudo (preenchimento manual).
  const CAMPOS_OCULTOS_FACEBOOK = new Set([
    "seguindo",
    "comentarios",
    "cliques",
    "mensagens",
    "reels",
    "stories",
  ]);
  const ocultar = (campo: string) =>
    plataforma === "facebook" && CAMPOS_OCULTOS_FACEBOOK.has(campo);

  function conexaoAtiva(provider: string): boolean {
    return conexoes.some((c) => c.provider === provider && c.connected_at);
  }

  function aplicarMetricas(m: MetricasImportadas) {
    if (m.alcance_total != null) setAlcance(String(m.alcance_total));
    if (m.impressoes != null) setImpressoes(String(m.impressoes));
    if (m.seguidores_inicio != null) setSeguidoresInicio(String(m.seguidores_inicio));
    if (m.seguidores_fim != null) setSeguidoresFim(String(m.seguidores_fim));
    if (m.seguindo != null) setSeguindo(String(m.seguindo));
    if (m.total_curtidas != null) setCurtidas(String(m.total_curtidas));
    if (m.comentarios != null) setComentarios(String(m.comentarios));
    if (m.cliques_link != null) setCliques(String(m.cliques_link));
    if (m.mensagens != null) setMensagens(String(m.mensagens));
    if (m.total_reels != null) setReels(String(m.total_reels));
    if (m.total_stories != null) setStories(String(m.total_stories));
    if (m.posts_feitos != null) setPosts(String(m.posts_feitos));
    else if (m.total_posts != null) setPosts(String(m.total_posts));
  }

  function handleImport() {
    const fd = new FormData();
    fd.set("cliente_id", clienteId);
    fd.set("provider", plataforma);
    fd.set("mes_referencia", `${mes}-01`);
    startImport(async () => {
      const res = await importarMetricasAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        setImportHint(null);
        return;
      }
      aplicarMetricas(res.metricas);
      const label = plataforma === "instagram" ? "Instagram" : "Facebook";
      setImportHint(`Importado de ${label} — revise antes de salvar.`);
      toast.success("Métricas importadas — revise antes de salvar.");
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData();
    fd.set("cliente_id", clienteId);
    fd.set("mes_referencia", `${mes}-01`);
    fd.set("plataforma", plataforma);
    fd.set("seguidores_inicio", seguidoresInicio || "0");
    fd.set("seguidores_fim", seguidoresFim || "0");
    fd.set("seguindo", seguindo || "0");
    fd.set("alcance_total", alcance);
    fd.set("impressoes", impressoes);
    fd.set("total_posts", posts);
    fd.set("total_reels", reels);
    fd.set("total_stories", stories);
    fd.set("total_curtidas", curtidas);
    fd.set("comentarios", comentarios);
    fd.set("cliques_link", cliques);
    fd.set("mensagens", mensagens);
    fd.set("posts_feitos", posts);
    fd.set("leads_validados", leads);
    fd.set("investimento_ads", invest);
    fd.set("receita_gerada", receita);
    if (observacoes) fd.set("observacoes", observacoes);
    startTransition(async () => {
      const res = await criarRelatorioAction(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setOpen(false);
        setAlcance("0");
        setImpressoes("0");
        setLeads("0");
        setReceita("0");
        setInvest("0");
        setPosts("0");
        setReels("0");
        setStories("0");
        setCurtidas("0");
        setComentarios("0");
        setMensagens("0");
        setCliques("0");
        setSeguindo("0");
        setSeguidoresInicio("0");
        setSeguidoresFim("0");
        setObservacoes("");
        setImportHint(null);
        setTimeout(() => setSuccess(false), 3000);
      }
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
            <BarChart3 className="h-4 w-4 text-royal-300" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-100">Novo relatório</p>
            <p className="text-xs text-slate-500">Registre as métricas mensais deste cliente.</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Mês</label>
              <input
                type="month"
                className="input text-sm"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label text-xs">Plataforma</label>
              <select
                className="input text-sm"
                value={plataforma}
                onChange={(e) => setPlataforma(e.target.value as typeof PLATAFORMAS_REDES[number])}
              >
                {PLATAFORMAS_REDES.map((p) => (
                  <option key={p} value={p}>
                    {p === "twitter" ? "X (Twitter)" : p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Importar métricas da Meta (Instagram/Facebook) */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={importando}
              disabled={!podeImportar}
              onClick={handleImport}
              iconLeft={<DownloadCloud className="h-3.5 w-3.5" />}
            >
              Importar métricas
            </Button>
            {plataforma !== "instagram" && plataforma !== "facebook" ? (
              <span className="text-xs text-slate-500">
                Disponível apenas para Instagram e Facebook.
              </span>
            ) : !conexaoAtiva(plataforma) ? (
              <span className="text-xs text-slate-500">
                Conecte a conta na aba Informações para importar.
              </span>
            ) : importHint ? (
              <span className="text-xs text-emerald-400">{importHint}</span>
            ) : (
              <span className="text-xs text-slate-500">
                Puxa o mês selecionado direto da Meta.
              </span>
            )}
          </div>

          {/* Audiência */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Audiência</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <label className="label text-xs">Seguidores (início)</label>
                <input type="number" min="0" className="input text-sm" value={seguidoresInicio} onChange={(e) => setSeguidoresInicio(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">Seguidores (fim)</label>
                <input type="number" min="0" className="input text-sm" value={seguidoresFim} onChange={(e) => setSeguidoresFim(e.target.value)} />
              </div>
              {!ocultar("seguindo") && (
                <div>
                  <label className="label text-xs">Seguindo</label>
                  <input type="number" min="0" className="input text-sm" value={seguindo} onChange={(e) => setSeguindo(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          {/* Engajamento */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Engajamento</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="label text-xs">Posts feitos</label>
                <input type="number" min="0" className="input text-sm" value={posts} onChange={(e) => setPosts(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">Curtidas</label>
                <input type="number" min="0" className="input text-sm" value={curtidas} onChange={(e) => setCurtidas(e.target.value)} />
              </div>
              {!ocultar("comentarios") && (
                <div>
                  <label className="label text-xs">Comentários</label>
                  <input type="number" min="0" className="input text-sm" value={comentarios} onChange={(e) => setComentarios(e.target.value)} />
                </div>
              )}
              <div>
                <label className="label text-xs">Alcance</label>
                <input type="number" min="0" className="input text-sm" value={alcance} onChange={(e) => setAlcance(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Métricas extras */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Conversão & tráfego</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="label text-xs">Impressões</label>
                <input type="number" min="0" className="input text-sm" value={impressoes} onChange={(e) => setImpressoes(e.target.value)} />
              </div>
              {!ocultar("cliques") && (
                <div>
                  <label className="label text-xs">Cliques no link</label>
                  <input type="number" min="0" className="input text-sm" value={cliques} onChange={(e) => setCliques(e.target.value)} />
                </div>
              )}
              {!ocultar("mensagens") && (
                <div>
                  <label className="label text-xs">Mensagens</label>
                  <input type="number" min="0" className="input text-sm" value={mensagens} onChange={(e) => setMensagens(e.target.value)} />
                </div>
              )}
              <div>
                <label className="label text-xs">Leads</label>
                <input type="number" min="0" className="input text-sm" value={leads} onChange={(e) => setLeads(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Formato & Ads */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Formato & Ads</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {!ocultar("reels") && (
                <div>
                  <label className="label text-xs">Reels</label>
                  <input type="number" min="0" className="input text-sm" value={reels} onChange={(e) => setReels(e.target.value)} />
                </div>
              )}
              {!ocultar("stories") && (
                <div>
                  <label className="label text-xs">Stories</label>
                  <input type="number" min="0" className="input text-sm" value={stories} onChange={(e) => setStories(e.target.value)} />
                </div>
              )}
              <div>
                <label className="label text-xs">Invest. Ads (R$)</label>
                <input type="number" min="0" step="0.01" className="input text-sm" value={invest} onChange={(e) => setInvest(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="label text-xs">Receita gerada (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input text-sm"
              value={receita}
              onChange={(e) => setReceita(e.target.value)}
            />
          </div>

          <div>
            <label className="label text-xs">Observações</label>
            <textarea
              className="input text-sm min-h-[60px]"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Insights, conquistas, pontos de atenção..."
            />
          </div>

          {error && (
            <p className="text-sm text-danger-400 bg-danger-500/10 border border-danger-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              Relatório criado com sucesso.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={pending} iconLeft={<Save className="h-4 w-4" />}>
              Salvar relatório
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
