import { Logo } from "@/components/brand/Logo";
import { formatBRL, formatDate } from "@/lib/utils";
import type { ContratoStatus } from "@/types/database";
import { PrintButton } from "./PrintButton";

export function PrintContrato({
  titulo,
  conteudo,
  valorMensal,
  duracaoMeses,
  dataInicio,
  dataFim,
  status,
  agenciaNome,
  agenciaCnpj,
  agenciaEndereco,
  clienteNome,
  clienteResponsavel,
  clienteCnpj,
}: {
  titulo: string;
  conteudo: string;
  valorMensal: number | null;
  duracaoMeses: number | null;
  dataInicio: string | null;
  dataFim: string | null;
  status: ContratoStatus;
  agenciaNome: string | null;
  agenciaCnpj: string | null;
  agenciaEndereco: string | null;
  clienteNome: string | null;
  clienteResponsavel: string | null;
  clienteCnpj: string | null;
}) {
  return (
    <>
      {/* Estilos para impressão: sem background, margens A4, etc. */}
      <style>{`
        @page {
          size: A4;
          margin: 24mm 18mm 24mm 18mm;
        }
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
        }
        body { background: #f3f4f6; }
      `}</style>

      <div className="no-print fixed top-0 inset-x-0 z-50 bg-royal-600 text-white py-3 px-4 text-center text-sm shadow-md">
        <strong>Modo de impressão:</strong> pressione <kbd className="bg-white/20 px-1.5 py-0.5 rounded mx-1">Ctrl/Cmd + P</kbd> e
        selecione “Salvar como PDF” como destino.
        <PrintButton />
      </div>

      <div className="pt-16 pb-8 px-4 max-w-[210mm] mx-auto">
        <div className="bg-white text-slate-900 shadow-lg p-12 print:shadow-none print:p-0">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <Logo variant="mark" className="!h-10" />
              <div>
                <p className="text-base font-bold text-slate-900">{agenciaNome ?? "Agência"}</p>
                {agenciaCnpj && <p className="text-xs text-slate-600">CNPJ: {agenciaCnpj}</p>}
              </div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>Contrato</p>
              <p className="font-mono text-sm text-slate-900">{titulo}</p>
              <p className="mt-1">Status: {status}</p>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div>
              <p className="text-xs uppercase text-slate-500">Valor mensal</p>
              <p className="font-semibold text-slate-900">
                {valorMensal ? formatBRL(valorMensal) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Duração</p>
              <p className="font-semibold text-slate-900">{duracaoMeses ?? "—"} meses</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Vigência</p>
              <p className="font-semibold text-slate-900">
                {dataInicio ? formatDate(dataInicio) : "—"} até{" "}
                {dataFim ? formatDate(dataFim) : "—"}
              </p>
            </div>
          </div>

          {/* Conteúdo do contrato (HTML) */}
          <div
            className="prose prose-sm max-w-none text-slate-800
              prose-headings:text-slate-900 prose-h1:text-xl prose-h2:text-base
              prose-strong:text-slate-900"
            dangerouslySetInnerHTML={{ __html: conteudo }}
          />

          {/* Assinaturas (linhas) */}
          <div className="mt-16 grid grid-cols-2 gap-12 text-sm">
            <div>
              <div className="border-t border-slate-400 pt-1">
                <p className="font-semibold text-slate-900">CONTRATANTE</p>
                <p className="text-slate-700">{clienteNome ?? "—"}</p>
                <p className="text-slate-600 text-xs">{clienteResponsavel ?? ""}</p>
                {clienteCnpj && <p className="text-slate-600 text-xs">CPF/CNPJ: {clienteCnpj}</p>}
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1">
                <p className="font-semibold text-slate-900">CONTRATADA</p>
                <p className="text-slate-700">{agenciaNome ?? "—"}</p>
                {agenciaCnpj && <p className="text-slate-600 text-xs">CNPJ: {agenciaCnpj}</p>}
                {agenciaEndereco && <p className="text-slate-600 text-xs">{agenciaEndereco}</p>}
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-12 pt-3 border-t border-slate-300 text-[10px] text-slate-500 flex justify-between">
            <span>Documento gerado eletronicamente • SM Hub</span>
            <span>
              {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
