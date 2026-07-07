import {
  Wallet,
  AlertCircle,
  FileText,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { MiniStat } from "@/components/admin/MiniStat";
import { formatBRL, formatNumber } from "@/lib/utils";
import type { Contrato, Fatura, Relatorio } from "@/types/database";

export function ClienteMiniStats({
  faturas,
  contratos,
  relatorios,
  briefings,
}: {
  faturas: Pick<Fatura, "status" | "valor" | "data_vencimento">[];
  contratos: Pick<Contrato, "status">[];
  relatorios: Pick<Relatorio, "alcance_total" | "leads_validados" | "receita_gerada">[];
  briefings: number;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const faturasAbertas = faturas.filter((f) => f.status !== "pago");
  const valorAberto = faturasAbertas.reduce((s, f) => s + Number(f.valor), 0);
  const valorVencido = faturasAbertas
    .filter((f) => f.data_vencimento < hoje)
    .reduce((s, f) => s + Number(f.valor), 0);
  const contratosAtivos = contratos.filter((c) => c.status === "ativo" || c.status === "assinado").length;
  const alcanceTotal = relatorios.reduce((s, r) => s + Number(r.alcance_total), 0);
  const leadsTotal = relatorios.reduce((s, r) => s + Number(r.leads_validados), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      <MiniStat
        label="Faturas abertas"
        value={faturasAbertas.length}
        icon={<Wallet className="h-4 w-4" />}
        tone={faturasAbertas.length > 0 ? "warn" : "default"}
        hint={faturasAbertas.length > 0 ? formatBRL(valorAberto) : "Em dia"}
      />
      <MiniStat
        label="Valor vencido"
        value={formatBRL(valorVencido)}
        icon={<AlertCircle className="h-4 w-4" />}
        tone={valorVencido > 0 ? "danger" : "success"}
        hint={valorVencido > 0 ? "Atenção" : "Sem atrasos"}
      />
      <MiniStat
        label="Contratos ativos"
        value={contratosAtivos}
        icon={<FileText className="h-4 w-4" />}
        tone="brand"
        hint={`${contratos.length} no total`}
      />
      <MiniStat
        label="Briefings"
        value={briefings}
        icon={<ClipboardList className="h-4 w-4" />}
        tone="default"
        hint={briefings > 0 ? "Respondidos" : "Pendente"}
      />
      <MiniStat
        label="Alcance total"
        value={formatNumber(alcanceTotal)}
        icon={<BarChart3 className="h-4 w-4" />}
        tone="default"
        hint={`${leadsTotal} leads`}
      />
    </div>
  );
}
