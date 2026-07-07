import { Logo } from "@/components/brand/Logo";
import { formatDate } from "@/lib/utils";
import { ENTRY_TIPO_LABEL, ENTRY_STATUS } from "@/lib/constants";
import { PrintButton } from "@/components/contracts/PrintButton";
import type { PlanejamentoEntrada, PlanejamentoStatus } from "@/types/database";

interface PrintPlanejamentoProps {
  agenciaNome: string | null;
  agenciaLogoUrl: string | null;
  clienteNome: string | null;
  mesLabel: string; // ex.: "Janeiro 2026"
  status: PlanejamentoStatus;
  objetivoGeral: string | null;
  observacoes: string | null;
  entradas: PlanejamentoEntrada[];
}

/**
 * View A4 otimizada pra impressão do planejamento editorial.
 * Espelha PrintContrato. O usuário abre via PlanejamentoPDFButton e usa
 * Ctrl/Cmd+P → "Salvar como PDF".
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
        @page { size: A4; margin: 20mm 16mm 20mm 16mm; }
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
        }
        body { background: #f3f4f6; }
      `}</style>

      <div className="no-print fixed top-0 inset-x-0 z-50 bg-royal-600 text-white py-3 px-4 text-center text-sm shadow-md">
        <strong>Modo de impressão:</strong> pressione{" "}
        <kbd className="bg-white/20 px-1.5 py-0.5 rounded mx-1">Ctrl/Cmd + P</kbd> e
        selecione “Salvar como PDF” como destino.
        <PrintButton />
      </div>

      <div className="pt-16 pb-8 px-4 max-w-[210mm] mx-auto">
        <div className="bg-white text-slate-900 shadow-lg p-12 print:shadow-none print:p-0">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-4 mb-6">
            <div className="flex items-center gap-3">
              {agenciaLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agenciaLogoUrl}
                  alt={agenciaNome ?? "Logo"}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <Logo variant="mark" className="!h-10" />
              )}
              <div>
                <p className="text-base font-bold text-slate-900">
                  {agenciaNome ?? "Agência"}
                </p>
                <p className="text-xs text-slate-600">Planejamento editorial</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p className="capitalize">{mesLabel}</p>
              <p className="mt-1">Cliente: <span className="font-semibold text-slate-900">{clienteNome ?? "—"}</span></p>
              <p className="mt-1">Status: {status}</p>
            </div>
          </div>

          {/* Objetivo / observações */}
          {(objetivoGeral || observacoes) && (
            <div className="mb-6 space-y-3 text-sm">
              {objetivoGeral && (
                <div>
                  <p className="text-xs uppercase text-slate-500 mb-1">Objetivo geral</p>
                  <p className="text-slate-800 whitespace-pre-wrap">{objetivoGeral}</p>
                </div>
              )}
              {observacoes && (
                <div>
                  <p className="text-xs uppercase text-slate-500 mb-1">Observações</p>
                  <p className="text-slate-800 whitespace-pre-wrap">{observacoes}</p>
                </div>
              )}
            </div>
          )}

          {/* Tabela de entradas */}
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Entradas programadas ({entradas.length})
          </h2>
          {entradas.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Nenhuma entrada neste mês.</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-300">
                  <th className="py-2 pr-2 font-medium">Data</th>
                  <th className="py-2 pr-2 font-medium">Tipo</th>
                  <th className="py-2 pr-2 font-medium">Título</th>
                  <th className="py-2 pr-2 font-medium">Estilo</th>
                  <th className="py-2 pr-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Copy / Hashtags</th>
                </tr>
              </thead>
              <tbody>
                {entradas.map((e) => (
                  <tr key={e.id} className="border-b border-slate-200 align-top">
                    <td className="py-2 pr-2 whitespace-nowrap">{formatDate(e.data)}</td>
                    <td className="py-2 pr-2">{ENTRY_TIPO_LABEL[e.tipo] ?? e.tipo}</td>
                    <td className="py-2 pr-2 font-medium text-slate-900">{e.titulo}</td>
                    <td className="py-2 pr-2 text-slate-600">{e.estilo ?? "—"}</td>
                    <td className="py-2 pr-2">
                      {ENTRY_STATUS[e.status]?.label ?? e.status}
                    </td>
                    <td className="py-2 text-slate-600">
                      {e.copy && <p className="whitespace-pre-wrap mb-1">{e.copy}</p>}
                      {e.hashtags && e.hashtags.length > 0 && (
                        <p className="text-slate-500">{e.hashtags.join(" ")}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Rodapé */}
          <div className="mt-12 pt-3 border-t border-slate-300 text-[10px] text-slate-500 flex justify-between">
            <span>Documento gerado eletronicamente • SM Hub</span>
            <span>
              {new Date().toLocaleDateString("pt-BR")} às{" "}
              {new Date().toLocaleTimeString("pt-BR")}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}