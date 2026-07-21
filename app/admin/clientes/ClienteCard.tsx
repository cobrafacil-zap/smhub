import Link from "next/link";
import {
  CalendarDays,
  BarChart3,
  Wallet,
  FileText,
  ClipboardList,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CLIENTE_STATUS } from "@/lib/constants";
import { formatBRL, formatDate } from "@/lib/utils";
import { ExcluirClienteButton } from "./ExcluirClienteButton";
import { ClienteStatusButtons } from "./[id]/ClienteStatusButtons";
import type { Cliente, Fatura } from "@/types/database";

export type ClienteCardData = Cliente & {
  proximaFatura?: Pick<Fatura, "id" | "data_vencimento" | "valor" | "status" | "numero"> | null;
  faturasAtrasadasCount?: number;
  faturasAVencerCount?: number;
};

const SHORTCUTS = [
  { key: "briefing", label: "Briefing", icon: ClipboardList },
  { key: "contratos", label: "Contrato", icon: FileText },
  { key: "financeiro", label: "Financ.", icon: Wallet },
  { key: "planejamento", label: "Planej.", icon: CalendarDays },
  { key: "relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

function getIniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "?";
}

function avatarBgFor(nome: string): string {
  // Gera uma cor consistente baseada no nome
  const cores = [
    "from-royal-500 to-royal-700",
    "from-purple-500 to-purple-700",
    "from-emerald-500 to-emerald-700",
    "from-amber-500 to-amber-700",
    "from-rose-500 to-rose-700",
    "from-cyan-500 to-cyan-700",
    "from-indigo-500 to-indigo-700",
  ];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  return cores[hash % cores.length];
}

export function ClienteCard({ cliente, proximaFatura, faturasAtrasadasCount = 0, faturasAVencerCount = 0, readOnly = false }: { cliente: ClienteCardData; proximaFatura?: ClienteCardData["proximaFatura"]; faturasAtrasadasCount?: number; faturasAVencerCount?: number; readOnly?: boolean }) {
  const st = CLIENTE_STATUS[cliente.status];
  const inadimplente = faturasAtrasadasCount > 0;
  const aVencer = faturasAVencerCount > 0;
  return (
    <Card className="flex flex-col gap-4 hover:border-royal-500/40 transition-colors" hoverable>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`h-12 w-12 rounded-xl bg-gradient-to-br ${avatarBgFor(cliente.nome_empresa)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-glow`}
        >
          {getIniciais(cliente.nome_empresa)}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/admin/clientes/${cliente.id}`}
            className="font-semibold text-slate-100 hover:text-royal-300 block truncate"
          >
            {cliente.nome_empresa}
          </Link>
          <p className="text-xs text-slate-400 truncate">{cliente.nome_responsavel}</p>
        </div>
        <Badge variant={st.color}>{st.label}</Badge>
      </div>

      {/* Tags rápidas (etiquetas) */}
      <div className="flex flex-wrap gap-1.5">
        {inadimplente && (
          <Badge variant="danger" className="inline-flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Inadimplente ({faturasAtrasadasCount})
          </Badge>
        )}
        {aVencer && (
          <Badge variant="warning" className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            A vencer ({faturasAVencerCount})
          </Badge>
        )}
        {!inadimplente && !aVencer && (
          <Badge variant="success" className="inline-flex items-center gap-1">
            Em dia
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="space-y-1.5 text-xs text-slate-400">
        {cliente.segmento && (
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{cliente.segmento}</span>
          </div>
        )}
        {cliente.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{cliente.email}</span>
          </div>
        )}
        {cliente.telefone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>{cliente.telefone}</span>
          </div>
        )}
      </div>

      {/* Valor + próxima fatura */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Mensalidade</p>
          <p className="text-base font-semibold text-royal-300">
            {cliente.valor_mensal ? formatBRL(cliente.valor_mensal) : "—"}
          </p>
        </div>
        {proximaFatura ? (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Próx. fatura</p>
            <p className="text-sm font-medium text-slate-200">
              {formatDate(proximaFatura.data_vencimento)}
            </p>
            <p className="text-[10px] text-slate-500">{formatBRL(proximaFatura.valor)}</p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Próx. fatura</p>
            <p className="text-sm text-slate-500">Sem fatura aberta</p>
          </div>
        )}
      </div>

      {/* Atalhos (membros não veem atalhos de áreas admin-only) */}
      <div className="flex flex-wrap gap-1.5">
        {SHORTCUTS.filter((s) => !readOnly || (s.key !== "financeiro" && s.key !== "contratos")).map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.key}
              href={`/admin/clientes/${cliente.id}?tab=${s.key}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-elevated hover:bg-royal-500/15 hover:text-royal-200 text-[11px] font-medium text-slate-300 transition"
            >
              <Icon className="h-3 w-3" />
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Footer: ações rápidas + excluir (somente admin) */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <ClienteStatusButtons
            clienteId={cliente.id}
            currentStatus={cliente.status}
            compact
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              Desde {formatDate(cliente.created_at)}
            </span>
            <ExcluirClienteButton id={cliente.id} nome={cliente.nome_empresa} />
          </div>
        </div>
      )}
      {readOnly && (
        <div className="pt-2 border-t border-border">
          <span className="text-[10px] text-slate-500">
            Desde {formatDate(cliente.created_at)} · somente leitura
          </span>
        </div>
      )}
    </Card>
  );
}
