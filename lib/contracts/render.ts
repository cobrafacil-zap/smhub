import type { VariavelContrato } from "@/types/database";

/**
 * Substitui placeholders no template de contrato.
 * Formato aceito:
 *   {{chave}}              → valor simples
 *   {{chave.subchave}}     → valor aninhado (objeto)
 *
 * Suporta HTML dentro do conteúdo (templates chegam como HTML).
 */
export function renderTemplate(
  template: string,
  values: Record<string, unknown>,
  variaveis: VariavelContrato[] = []
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const value = getNested(values, key);
    if (value === undefined || value === null) {
      // Marca placeholder não preenchido (visível em preview para o admin)
      return `__${key}__`;
    }
    if (typeof value === "number") {
      // Formata números de moeda/quantidade com 2 casas
      return value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return String(value);
  });
}

function getNested(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj
    );
}

/** Extrai todas as chaves `{{...}}` de um template. */
export function extractPlaceholders(template: string): string[] {
  const matches = template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g);
  return Array.from(new Set(Array.from(matches, (m) => m[1]!)));
}

/** Converte número para extenso (PT-BR) — básico, para valores e durações. */
export function numeroParaExtenso(n: number): string {
  if (n === 0) return "zero";
  if (n === 1) return "um";
  if (n === 2) return "dois";
  if (n === 3) return "três";
  if (n === 4) return "quatro";
  if (n === 5) return "cinco";
  if (n === 6) return "seis";
  if (n === 7) return "sete";
  if (n === 8) return "oito";
  if (n === 9) return "nove";
  if (n === 10) return "dez";
  if (n === 11) return "onze";
  if (n === 12) return "doze";
  // Para outros valores, mantemos o numeral — admin pode editar.
  return n.toString();
}

/** Valor em reais por extenso — wrapper simples. */
export function valorPorExtenso(valor: number): string {
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  if (centavos === 0) return `${numeroParaExtenso(inteiro)} reais`;
  return `${numeroParaExtenso(inteiro)} reais e ${centavos} centavos`;
}

/** Datas por extenso em PT-BR. ex: "30 de junho de 2026". */
export function dataPorExtenso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${d} de ${meses[m - 1]} de ${y}`;
}
