"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BRLInputProps {
  name: string;
  defaultValue?: number | string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/**
 * Input que formata visualmente como BRL (R$ 2.799,00) e envia o valor numérico puro
 * (em reais, ex: 2799) num campo hidden com `name`.
 *
 * Vantagem: o usuário digita 2799 e vê "R$ 2.799,00" enquanto digita.
 * Aceita vírgula ou ponto como separador decimal.
 */
export function BRLInput({
  name,
  defaultValue = 0,
  placeholder = "R$ 0,00",
  className,
  required,
}: BRLInputProps) {
  const [display, setDisplay] = useState(() => {
    const v = Number(defaultValue) || 0;
    return formatDisplay(v);
  });

  function formatDisplay(v: number): string {
    if (Number.isNaN(v) || v === 0) return "";
    return v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }

  function parseValue(text: string): number {
    if (!text) return 0;
    // remove tudo que não é dígito, vírgula ou ponto
    const cleaned = text.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // remove "R$" e espaços
    const numeric = raw.replace(/[^\d,.-]/g, "");
    setDisplay(numeric);
  }

  function handleBlur() {
    const n = parseValue(display);
    setDisplay(formatDisplay(n));
  }

  function handleFocus() {
    // quando foca, mostra só o número (sem R$) pra facilitar edição
    const n = parseValue(display);
    if (n === 0) {
      setDisplay("");
    } else {
      setDisplay(n.toString().replace(".", ","));
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        className={cn("input", className)}
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        required={required}
      />
      {/* Campo hidden CONTROLADO: precisa acompanhar o que o usuário digita.
          Antes era `defaultValue` (não-controlado, setado só no mount), então
          o salário nunca atualizava ao editar — sempre enviava o valor inicial. */}
      <input type="hidden" name={name} value={parseValue(display)} readOnly />
    </div>
  );
}
