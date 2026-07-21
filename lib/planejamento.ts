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