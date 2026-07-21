// Frase motivacional rotativa DETERMINÍSTICA por dia do ano (estável o dia todo,
// troca no dia seguinte). Diferente do mensagemDoDia() do admin, que usa
// Math.random e troca a cada render.

const FRASES: readonly string[] = [
  "Que hoje seus resultados falem mais alto que qualquer post. 🚀",
  "Cada métrica é uma história — bora escrever uma boa hoje. 📊",
  "Pequenos ajustes hoje, grandes resultados amanhã. ✨",
  "Seu público cresce um post de cada vez. Continue! 💪",
  "Dados não mentem: olhe, ajuste e avance. 🎯",
  "Conteúdo relevante é o melhor investimento que existe. 💡",
  "Hoje é mais um passo rumo ao topo. Bora! 🌟",
  "Consistência vence talento que não trabalha. 🔥",
  "Cada cliente é um parceiro nessa jornada. 🤝",
  "Foque no valor que você entrega — o resto vem junto. 🌱",
  "Um dia de cada vez, uma vitória de cada vez. 🏆",
  "Criatividade + dados = receita que funciona. 🧪",
];

function diaDoAno(d: Date): number {
  const inicio = new Date(d.getFullYear(), 0, 0).getTime();
  return Math.floor((d.getTime() - inicio) / 86_400_000);
}

export function fraseDoDia(d: Date = new Date()): string {
  return FRASES[diaDoAno(d) % FRASES.length];
}