// ===========================================================================
// Cálculo de prazo da tarefa automática de uma entrada do planejamento.
// ===========================================================================
// Regra (SM Hub):
//   - A peça de um post programado para a semana N deve ficar pronta até o
//     "dia de entrega" da semana N-1 (a semana anterior à do post).
//     Ex.: dia de entrega = sexta; post na semana que vem -> sexta desta semana.
//   - Se o post é da semana atual (ou passada), o prazo cai no passado -> a
//     tarefa nasce com prioridade "urgente".
//
// diaEntrega usa a convenção JS getDay(): 0=Dom .. 6=Sáb (padrão 5=Sexta).
// ===========================================================================

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calcula o prazo (YYYY-MM-DD) e se a tarefa é urgente para uma entrada cujo
 * post está programado para `postDateStr` (YYYY-MM-DD).
 *
 * @param postDateStr data do post ("YYYY-MM-DD")
 * @param diaEntrega  dia da semana de entrega (0=Dom..6=Sáb). Default 5 (Sexta).
 * @param hoje        data de referência (injetável p/ testes). Default = hoje.
 */
export function prazoDaEntrada(
  postDateStr: string,
  diaEntrega: number = 5,
  hoje: Date = new Date()
): { prazo: string; urgente: boolean } {
  const post = new Date(postDateStr + "T00:00:00");
  const ref = new Date(hoje);
  ref.setHours(0, 0, 0, 0);

  // Segunda-feira da semana do post (getDay: 0=Dom..6=Sáb; Seg=1).
  // (postDay + 6) % 7 = dias desde a segunda.
  const offsetToMonday = (post.getDay() + 6) % 7;
  const monday = new Date(post);
  monday.setDate(post.getDate() - offsetToMonday);

  // Segunda da semana anterior.
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);

  // Dia de entrega dentro da semana anterior.
  // prevMonday é Seg (getDay=1). Offset até diaEntrega:
  //   diaEntrega >= 1 (Seg..Sáb) -> diaEntrega - 1
  //   diaEntrega == 0 (Dom)       -> 6 (domingo no fim da semana anterior)
  const offset = diaEntrega === 0 ? 6 : diaEntrega - 1;
  const prazo = new Date(prevMonday);
  prazo.setDate(prevMonday.getDate() + offset);

  // Urgente quando o prazo já passou (post desta semana ou anterior).
  const urgente = prazo.getTime() <= ref.getTime();

  return { prazo: toISODate(prazo), urgente };
}

/**
 * Janela de entrega do quadro de tarefas: mostra só o que é desta semana e da
 * próxima (mais as atrasadas). Tarefas com prazo daqui 2 semanas ou mais ficam
 * ocultas até entrarem na janela.
 *
 * Tarefas sem prazo (criadas manualmente sem data) continuam visíveis.
 */
export function prazoDentroJanelaDuasSemanas(
  prazo: string | null | undefined,
  hoje: Date = new Date()
): boolean {
  if (!prazo) return true;
  const ref = new Date(hoje);
  ref.setHours(0, 0, 0, 0);
  const offsetToMonday = (ref.getDay() + 6) % 7;
  const startThisWeek = new Date(ref);
  startThisWeek.setDate(ref.getDate() - offsetToMonday); // segunda desta semana
  const limite = new Date(startThisWeek);
  limite.setDate(startThisWeek.getDate() + 14); // segunda da semana seguinte à próxima
  const p = new Date(prazo + "T00:00:00");
  return p.getTime() < limite.getTime();
}

export type Periodo = "semana" | "mes";

/** Nome amigável de um prazo relativo a hoje, para agrupamento no kanban. */
export function faixaPrazo(prazo: string | null | undefined, hoje: Date = new Date()): string {
  // Tarefa sem prazo cai em "Esta semana" — sem uma faixa "Sem data" separada,
  // porque o dropdown e o diálogo exigem prazo. Tarefas antigas sem prazo
  // continuam visíveis no quadro, só agrupadas em "Esta semana".
  if (!prazo) return "Esta semana";

  const ref = new Date(hoje);
  ref.setHours(0, 0, 0, 0);
  const p = new Date(prazo + "T00:00:00");

  const diffMs = p.getTime() - ref.getTime();
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return "Atrasado";
  if (diffDias === 0) return "Hoje";
  if (diffDias === 1) return "Amanhã";
  if (diffDias < 7) return "Esta semana";
  if (diffDias < 14) return "Próxima semana";
  return "Depois";
}

export const ORDEM_FAIXA = ["Atrasado", "Hoje", "Amanhã", "Esta semana", "Próxima semana", "Depois"];

/**
 * Início (segunda) e fim (domingo) da semana, ou 1º e último dia do mês,
 * para a data de referência `refIso` (YYYY-MM-DD). Retorna também um label e se
 * o período contém "hoje".
 */
export function periodoRef(refIso: string, periodo: Periodo, hoje: Date = new Date()) {
  const ref = new Date(refIso + "T00:00:00");
  const h = new Date(hoje);
  h.setHours(0, 0, 0, 0);

  let inicio: Date;
  let fim: Date;
  let label: string;

  if (periodo === "semana") {
    const offsetToMonday = (ref.getDay() + 6) % 7;
    inicio = new Date(ref);
    inicio.setDate(ref.getDate() - offsetToMonday);
    fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 4); // sexta (semana de trabalho seg–sex)
    label = `Semana de ${inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} a ${fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
  } else {
    inicio = new Date(ref.getFullYear(), ref.getMonth(), 1);
    fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    label = inicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  const contemHoje = h >= inicio && h <= fim;
  return { inicio, fim, label, contemHoje };
}

/**
 * Diz se uma tarefa (pelo prazo) pertence ao período selecionado. Quando o
 * período contém hoje, inclui também as atrasadas (prazo < início) — o
 * designer precisa ver o que ficou pendente. Tarefas sem prazo só aparecem no
 * período atual (pra não se perderem), não ao navegar pra outros períodos.
 */
export function prazoDentroPeriodo(
  prazo: string | null | undefined,
  inicio: Date,
  fim: Date,
  contemHoje: boolean
): boolean {
  if (!prazo) return contemHoje;
  const p = new Date(prazo + "T00:00:00");
  if (contemHoje) return p.getTime() <= fim.getTime(); // atrasadas + período atual
  return p.getTime() >= inicio.getTime() && p.getTime() <= fim.getTime();
}