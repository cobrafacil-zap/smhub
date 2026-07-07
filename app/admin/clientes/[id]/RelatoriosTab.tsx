import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PLATAFORMA_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { RelatorioForm } from "./RelatorioForm";
import { RelatorioActions } from "./RelatorioActions";
import { RelatorioFiltro } from "./RelatorioFiltro";
import type { Cliente, ConexaoRede, Relatorio } from "@/types/database";

export async function RelatoriosTab({
  cliente,
  searchParams,
}: {
  cliente: Cliente;
  searchParams: { mes?: string };
}) {
  const supabase = createClient();
  let query = supabase
    .from("relatorios")
    .select("*")
    .eq("cliente_id", cliente.id)
    .order("mes_referencia", { ascending: false });

  if (searchParams.mes) {
    // YYYY-MM
    query = query
      .gte("mes_referencia", `${searchParams.mes}-01`)
      .lt("mes_referencia", `${searchParams.mes}-32`);
  }
  const { data: rels } = await query;
  const list = (rels as Relatorio[] | null) ?? [];

  // Conexões OAuth (Instagram/Facebook) — só colunas não-sensíveis.
  const { data: oauthRows } = await supabase
    .from("cliente_oauth_contas")
    .select("provider, account_handle, account_name, connected_at")
    .eq("cliente_id", cliente.id);
  const conexoes = (oauthRows as ConexaoRede[] | null) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RelatorioFiltro basePath={`/admin/clientes/${cliente.id}`} tabKey="relatorios" mesAtual={searchParams.mes ?? ""} />
        <RelatorioForm clienteId={cliente.id} conexoes={conexoes} />
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" />}
            title="Sem relatórios"
            description="Use o formulário acima para cadastrar o primeiro relatório mensal."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <Card key={r.id} className="hover:border-royal-500/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-100 capitalize">
                      {new Date(r.mes_referencia).toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h4>
                    <Badge variant="brand">{PLATAFORMA_LABELS[r.plataforma] ?? r.plataforma}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                    <div>
                      <p className="text-slate-500">Seguidores</p>
                      <p className="text-slate-200 font-medium">
                        {formatNumber(r.seguidores_inicio)} → {formatNumber(r.seguidores_fim)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Seguindo</p>
                      <p className="text-slate-200 font-medium">{formatNumber(r.seguindo ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Posts / Reels / Stories</p>
                      <p className="text-slate-200 font-medium">
                        {r.total_posts} / {r.total_reels} / {r.total_stories}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Curtidas</p>
                      <p className="text-slate-200 font-medium">{formatNumber(r.total_curtidas)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Comentários</p>
                      <p className="text-slate-200 font-medium">{formatNumber(r.comentarios ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Alcance</p>
                      <p className="text-slate-200 font-medium">{formatNumber(r.alcance_total)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Impressões</p>
                      <p className="text-slate-200 font-medium">{formatNumber(r.impressoes)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Cliques no link</p>
                      <p className="text-slate-200 font-medium">{formatNumber(r.cliques_link ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Mensagens</p>
                      <p className="text-slate-200 font-medium">{formatNumber(r.mensagens ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Leads</p>
                      <p className="text-slate-200 font-medium">{formatNumber(r.leads_validados)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Invest. Ads</p>
                      <p className="text-amber-300 font-medium">R$ {formatNumber(r.investimento_ads)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Receita</p>
                      <p className="text-emerald-400 font-medium">R$ {formatNumber(r.receita_gerada)}</p>
                    </div>
                  </div>
                  {r.observacoes && (
                    <p className="text-xs text-slate-400 mt-2 italic line-clamp-2">
                      &ldquo;{r.observacoes}&rdquo;
                    </p>
                  )}
                </div>
                <RelatorioActions id={r.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
