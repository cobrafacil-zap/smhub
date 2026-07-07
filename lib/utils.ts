import { clsx, type ClassValue } from "clsx";

/** cn — helper para mesclar classes Tailwind condicionalmente. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMonth(month: number, year: number) {
  const m = String(month).padStart(2, "0");
  return `${m}/${year}`;
}

export function monthName(month: number) {
  const names = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return names[month - 1] ?? "";
}

export function calcChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function formatPercent(n: number) {
  return `${n.toFixed(1).replace(".", ",")}%`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Formata um número (em reais, não centavos) para BRL. ex.: 1500 → "R$ 1.500,00". */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Formata número (em reais) sem o símbolo, útil para inputs. ex.: 1500 → "1.500,00". */
export function formatBRLInput(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Interpreta texto de input BRL ("1.500,00" ou "1500") em número (reais). */
export function parseBRLToNumber(text: string): number {
  const only = text.replace(/\D/g, "");
  return only ? Number(only) / 100 : 0;
}

/** Data de término de contrato (YYYY-MM-DD): start + contractDays + extraDays. */
export function contractEndDate(
  startISO: string,
  contractDays: number,
  extraDays: number
): string {
  const d = new Date(startISO + "T00:00:00");
  d.setDate(d.getDate() + contractDays + extraDays);
  return d.toISOString().slice(0, 10);
}

/** Diferença em dias entre duas datas ISO (YYYY-MM-DD). Positivo = b posterior. */
export function daysBetween(startISO: string, endISO: string): number {
  const a = new Date(startISO + "T00:00:00").getTime();
  const b = new Date(endISO + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

/** True se hoje está entre startISO e endISO (inclusive). */
export function isVigente(
  startISO: string,
  endISO: string,
  today: Date = new Date()
): boolean {
  const t = today.toISOString().slice(0, 10);
  return t >= startISO && t <= endISO;
}

/** Iniciais de um nome (até 2 letras). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
