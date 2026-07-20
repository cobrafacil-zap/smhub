import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONTHS_PT } from "@/lib/constants";
import { CalendarDays, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { PlanejamentoMesNav } from "./PlanejamentoMesNav";
import { PlanejamentoCalendarClient } from "./PlanejamentoCalendarClient";
import { DatasComemorativasSugestoes } from "./DatasComemorativasSugestoes";
import { PlanejamentoPDFButton } from "@/components/calendar/PlanejamentoPDFButton";
import { EditarPlanejamentoButton } from "./EditarPlanejamentoButton";
import type {
  Briefing,
  Cliente,
  DataComemorativa,
  Planejamento,
  PlanejamentoEntrada,
} from "@/types/database";

function mesKey(mesReferencia: string): string {
  return mesReferencia.slice(0, 7);
}

function primeiroDiaDoMes(mes: string): string {
  return `${mes}-01`;
}

function labelDoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${MONTHS_PT[m - 1]} ${ano}`;
}

function parseMesYm(ym: string): { ano: number; mes: number } {
  const [a, m] = ym.split("-").map(Number);
  return { ano: a, mes: m };
}

export async function PlanejamentoTab({
  cliente,
  searchParams,
}: {
  cliente: Cliente;
  searchParams: { mes?: string };
}) {
  const supabase = createAdminClient();
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const mesAtivo = searchParams.mes ?? mesAtual;
  const mesReferencia = primeiroDiaDoMes(mesAtivo);
  const { ano, mes } = parseMesYm(mesAtivo);

  // 4) Datas comemorativas do mês (entre dia 1 e último dia do mês)
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const inicioMes = `${mesAtivo}-01`;
  const fimMes = `${mesAtivo}-${String(ultimoDia).padStart(2, "0")}`;

  // Queries 1, 3, 4 e 5 são independentes → rodam em paralelo. A 2 (entradas)
  // depende de plan.id, então roda depois, só se houver plan.
  const [{ data: plan }, { data: todosPlanejamentos }, { data: datas }, { data: briefings }] =
    await Promise.all([
      supabase
        .from("planejamentos")
        .select("*")
        .eq("cliente_id", cliente.id)
        .eq("mes_referencia", mesReferencia)
        .maybeSingle(),
      supabase
        .from("planejamentos")
        .select("id, mes_referencia")
        .eq("cliente_id", cliente.id)
        .order("mes_referencia", { ascending: false })
        .limit(12),
      supabase
        .from("datas_comemorativas")
        .select("*")
        .gte("data", inicioMes)
        .lte("data", fimMes)
        .order("data"),
      supabase
        .from("briefings")
        .select("id, created_at, respostas")
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  // 2) Entradas (depende de plan)
  let entradas: PlanejamentoEntrada[] = [];
  if (plan) {
    const { data } = await supabase
      .from("planejamento_entradas")
      .select("*")
      .eq("planejamento_id", (plan as Planejamento).id)
      .order("data");
    entradas = (data as PlanejamentoEntrada[] | null) ?? [];
  }

  const mesesDisponiveis = ((todosPlanejamentos as { mes_referencia: string }[] | null) ?? [])
    .map((p) => mesKey(p.mes_referencia));
  const datasComem = (datas as DataComemorativa[] | null) ?? [];
  const briefingRecente = (briefings as Pick<Briefing, "id" | "created_at">[] | null)?.[0];

  return (
    <div className="space-y-4">
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-royal-500/20 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-royal-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Planejamento editorial</p>
            <p className="text-xs text-slate-500">Organize posts, stories, reels e carrosséis do mês.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {plan && (
            <>
              <EditarPlanejamentoButton plan={plan as Planejamento} />
              <PlanejamentoPDFButton planejamentoId={(plan as Planejamento).id} />
            </>
          )}
          <PlanejamentoMesNav
            basePath={`/admin/clientes/${cliente.id}`}
            tabKey="planejamento"
            mesAtivo={mesAtivo}
            mesesDisponiveis={mesesDisponiveis}
          />
        </div>
      </Card>

      {/* Objetivo / observações do planejamento (quando preenchidos) */}
      {plan &&
        (((plan as Planejamento).objetivo_geral && (plan as Planejamento).objetivo_geral!.trim()) ||
          ((plan as Planejamento).observacoes && (plan as Planejamento).observacoes!.trim())) && (
          <Card className="!p-4 space-y-2">
            {(plan as Planejamento).objetivo_geral?.trim() && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Objetivo geral
                </p>
                <p className="text-sm text-slate-100 whitespace-pre-wrap">
                  {(plan as Planejamento).objetivo_geral}
                </p>
              </div>
            )}
            {(plan as Planejamento).observacoes?.trim() && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Observações
                </p>
                <p className="text-sm text-slate-100 whitespace-pre-wrap">
                  {(plan as Planejamento).observacoes}
                </p>
              </div>
            )}
          </Card>
        )}

      {/* Briefing do cliente (atalho) */}
      <Card className="!p-3 flex items-center justify-between gap-3 bg-bg-elevated/30">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="h-4 w-4 text-royal-300 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">Briefing do cliente</p>
            {briefingRecente ? (
              <p className="text-sm text-slate-200 truncate">
                Preenchido em{" "}
                {new Date(briefingRecente.created_at).toLocaleDateString("pt-BR")}
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic">Nenhum briefing cadastrado</p>
            )}
          </div>
        </div>
        <Link
          href={`/admin/clientes/${cliente.id}?tab=briefing`}
          className="text-xs text-royal-300 hover:text-royal-200 shrink-0"
        >
          {briefingRecente ? "Ver briefing →" : "Criar briefing →"}
        </Link>
      </Card>

      {/* Datas comemorativas (sugestões) */}
      {datasComem.length > 0 && (
        <DatasComemorativasSugestoes
          datas={datasComem}
          planejamentoId={plan ? (plan as Planejamento).id : null}
          clienteSegmento={cliente.segmento}
        />
      )}

      <PlanejamentoCalendarClient
        clienteId={cliente.id}
        planejamentoId={plan ? (plan as Planejamento).id : null}
        mesReferencia={mesReferencia}
        mesLabel={labelDoMes(mesAtivo)}
        entradas={entradas}
        diasPostagem={(plan as Planejamento | null)?.dias_postagem ?? null}
        canEdit
      />
    </div>
  );
}
