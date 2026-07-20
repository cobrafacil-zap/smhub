import { Logo } from "@/components/brand/Logo";
import { formatDate } from "@/lib/utils";
import {
  ENTRY_TIPO_LABEL,
  ENTRY_TIPO_COR,
  ENTRY_STATUS,
} from "@/lib/constants";
import { PrintButton } from "@/components/contracts/PrintButton";
import type { PlanejamentoEntrada, PlanejamentoStatus } from "@/types/database";

interface PrintPlanejamentoProps {
  agenciaNome: string | null;
  agenciaLogoUrl: string | null;
  clienteNome: string | null;
  mesLabel: string; // ex.: "Agosto 2026"
  status: PlanejamentoStatus;
  objetivoGeral: string | null;
  observacoes: string | null;
  entradas: PlanejamentoEntrada[];
}

const STATUS_LABEL_PT: Record<PlanejamentoStatus, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  em_execucao: "Em execução",
  concluido: "Concluído",
};

// Badge de status do PLANEJAMENTO (não da entrada) — paleta clara, amigável
// pra impressão.
const STATUS_BADGE: Record<PlanejamentoStatus, string> = {
  rascunho: "bg-slate-500/15 text-slate-700 border-slate-400/40",
  aprovado: "bg-success-500/15 text-success-700 border-success-500/40",
  em_execucao: "bg-royal-500/15 text-royal-700 border-royal-500/40",
  concluido: "bg-success-500/15 text-success-700 border-success-500/40",
};

// Badge de status da ENTRADA (pendente/aprovado/publicado/...).
const ENTRY_STATUS_BADGE: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-700 border-amber-500/40",
  aprovado: "bg-royal-500/15 text-royal-700 border-royal-500/40",
  publicado: "bg-success-500/15 text-success-700 border-success-500/40",
  rejeitado: "bg-danger-500/15 text-danger-700 border-danger-500/40",
  alteracao_solicitada: "bg-amber-500/15 text-amber-700 border-amber-500/40",
};

/**
 * View A4 otimizada pra impressão do planejamento editorial.
 * Layout em CARTÕES (uma entrada por bloco) em vez de tabela — a coluna de
 * copy costuma ter textos longos, que numa tabela de 6 colunas espreme e
 * quebra feio entre páginas. Cada cartão usa `break-inside: avoid` pra não
 * ser cortado no meio.
 */
export function PrintPlanejamento({
  agenciaNome,
  agenciaLogoUrl,
  clienteNome,
  mesLabel,
  status,
  objetivoGeral,
  observacoes,
  entradas,
}: PrintPlanejamentoProps) {
  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm 14mm 16mm 14mm; }
        html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { background: #e9e9ee; }
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; padding: 0 !important; }
          .print-card { break-inside: avoid; page-break-inside: avoid; }
          .section-title { break-after: avoid; page-break-after: avoid; }
        }
      `}</style>

      <div className="no-print fixed top-0 inset-x-0 z-50 bg-royal-600 text-white py-3 px-4 text-center text-sm shadow-md">
        <strong>Modo de impressão:</strong> pressione{" "}
        <kbd className="bg-white/20 px-1.5 py-0.5 rounded mx-1">Ctrl/Cmd + P</kbd> e
        selecione “Salvar como PDF” como destino.
        <PrintButton />
      </div>

      <div className="pt-16 pb-10 px-4">
        <div className="sheet bg-white text-slate-900 shadow-xl mx-auto max-w-[210mm] p-10">
          {/* Cabeçalho */}
          <header className="flex items-start justify-between gap-6 pb-5 border-b-2 border-royal-500">
            <div className="flex items-center gap-3 min-w-0">
              {agenciaLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agenciaLogoUrl}
                  alt={agenciaNome ?? "Logo"}
                  className="h-12 w-12 object-contain shrink-0"
                />
              ) : (
                <Logo variant="mark" className="!h-12 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-royal-600 font-semibold">
                  Planejamento Editorial
                </p>
                <p className="text-lg font-bold text-slate-900 leading-tight truncate">
                  {agenciaNome ?? "Agência"}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-slate-900 capitalize leading-tight">
                {mesLabel}
              </p>
              <p className="text-xs text-slate-600 mt-1.5">
                Cliente:{" "}
                <span className="font-semibold text-slate-900">
                  {clienteNome ?? "—"}
                </span>
              </p>
              <span
                className={`inline-block mt-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[status]}`}
              >
                {STATUS_LABEL_PT[status]}
              </span>
            </div>
          </header>

          {/* Objetivo / observações */}
          {(objetivoGeral || observacoes) && (
            <section className="mt-6 grid grid-cols-2 gap-4">
              {objetivoGeral && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-royal-600 font-semibold mb-1.5">
                    Objetivo geral
                  </p>
                  <p className="text-[12.5px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {objetivoGeral}
                  </p>
                </div>
              )}
              {observacoes && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-royal-600 font-semibold mb-1.5">
                    Observações
                  </p>
                  <p className="text-[12.5px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {observacoes}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Entradas */}
          <h2 className="section-title mt-7 mb-3 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Entradas programadas
            </span>
            <span className="text-xs font-medium text-slate-500">
              {entradas.length}{" "}
              {entradas.length === 1 ? "publicação" : "publicações"}
            </span>
          </h2>

          {entradas.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              Nenhuma entrada neste mês.
            </p>
          ) : (
            <div className="space-y-3">
              {entradas.map((e, i) => {
                const tipoCor = ENTRY_TIPO_COR[e.tipo]?.dot ?? "bg-slate-400";
                const tipoLabel = ENTRY_TIPO_LABEL[e.tipo] ?? e.tipo;
                const entryStatus = ENTRY_STATUS[e.status];
                const entryStatusLabel = entryStatus?.label ?? e.status;
                const entryStatusBadge =
                  ENTRY_STATUS_BADGE[e.status] ??
                  "bg-slate-500/15 text-slate-700 border-slate-400/40";
                return (
                  <article
                    key={e.id}
                    className="print-card relative rounded-lg border border-slate-200 overflow-hidden pl-4 pr-4 py-3.5"
                  >
                    {/* Barra de cor à esquerda (cor fixa por tipo de post) */}
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${tipoCor}`}
                    />
                    {/* Cabeçalho do cartão: data + tipo | status */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-bold text-slate-900 tabular-nums">
                          {formatDate(e.data)}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ENTRY_TIPO_COR[e.tipo]?.chip ?? "bg-slate-500/15 text-slate-700 border-slate-400/40"}`}
                        >
                          {tipoLabel}
                        </span>
                        {e.estilo && (
                          <span className="text-[10px] text-slate-500">
                            · {e.estilo}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${entryStatusBadge}`}
                      >
                        {entryStatusLabel}
                      </span>
                    </div>

                    {/* Título */}
                    {e.titulo && (
                      <p className="mt-1.5 text-[13px] font-semibold text-slate-900 leading-snug">
                        {e.titulo}
                      </p>
                    )}

                    {/* Copy */}
                    {e.copy && (
                      <p className="mt-1.5 text-[11.5px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {e.copy}
                      </p>
                    )}

                    {/* Hashtags */}
                    {e.hashtags && e.hashtags.length > 0 && (
                      <p className="mt-1.5 text-[11px] text-royal-700 font-medium break-words">
                        {e.hashtags.join(" ")}
                      </p>
                    )}

                    {/* Numerinha discreta pra referência */}
                    <span className="absolute right-2 bottom-1 text-[9px] text-slate-300 font-medium tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </article>
                );
              })}
            </div>
          )}

          {/* Rodapé */}
          <footer className="mt-10 pt-3 border-t border-slate-300 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Documento gerado eletronicamente • SM Hub</span>
            <span>
              {new Date().toLocaleDateString("pt-BR")} às{" "}
              {new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </footer>
        </div>
      </div>
    </>
  );
}