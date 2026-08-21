"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type LabelChip = { id: string; nome: string; cor: string };

/** Calcula a luminância relativa de uma cor hex pra decidir se o texto
 *  fica claro ou escuro em cima da cor. */
function textoCor(cor: string): "preto" | "branco" {
  const hex = cor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Luminância relativa (YIQ simplificado)
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  return lum >= 160 ? "preto" : "branco";
}

export function LabelChips({
  labels,
  max,
  size = "xs",
}: {
  labels: LabelChip[];
  max?: number;
  size?: "xs" | "sm";
}) {
  if (!labels || labels.length === 0) return null;
  const visiveis = typeof max === "number" ? labels.slice(0, max) : labels;
  const resto = labels.length - visiveis.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visiveis.map((l) => {
        const cor = l.cor || "#64748b";
        const fg = textoCor(cor);
        return (
          <span
            key={l.id}
            title={l.nome}
            className={cn(
              "inline-flex items-center rounded px-1.5 font-medium border",
              size === "xs" ? "text-[10px] py-0.5" : "text-xs py-1",
              "border-black/10"
            )}
            style={{ backgroundColor: cor, color: fg === "preto" ? "#0f172a" : "#f8fafc" }}
          >
            <span className="truncate max-w-[120px]">{l.nome}</span>
          </span>
        );
      })}
      {resto > 0 && (
        <span className="text-[10px] text-slate-500">+{resto}</span>
      )}
    </div>
  );
}

/** Chip maior clicável usado no LabelPicker (com check quando selecionado). */
export function LabelChipSelecionavel({
  label,
  selecionado,
  onClick,
}: {
  label: LabelChip;
  selecionado: boolean;
  onClick: () => void;
}) {
  const cor = label.cor || "#64748b";
  const fg = textoCor(cor);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border transition",
        "border-black/10 hover:scale-[1.02]",
        selecionado && "ring-2 ring-offset-1 ring-offset-bg-surface ring-white/40"
      )}
      style={{
        backgroundColor: cor,
        color: fg === "preto" ? "#0f172a" : "#f8fafc",
      }}
      title={label.nome}
    >
      <Check
        className={cn(
          "h-3 w-3 transition",
          selecionado ? "opacity-100" : "opacity-0 w-0"
        )}
      />
      <span>{label.nome}</span>
    </button>
  );
}
