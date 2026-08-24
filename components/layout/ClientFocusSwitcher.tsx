"use client";

import { useRef } from "react";
import { setFocusedClienteAction } from "@/lib/actions/focus-actions";
import { ChevronDown, Eye } from "lucide-react";
import { Select } from "@/components/ui/Select";

export interface ClienteResumo {
  id: string;
  nome_empresa: string;
  status?: "ativo" | "inativo" | "pausado" | string | null;
}

export interface ClientFocusSwitcherProps {
  clientes: ClienteResumo[];
  /** Id do cliente em foco atual (cookie) ou null. */
  currentId: string | null;
  /** Pathname atual — preservado no `next` para manter o usuário na mesma tela. */
  currentPathname: string;
}

/**
 * Dropdown que troca o "cliente em foco" sem sair da página atual.
 * Reusa o componente `Select` (mesma aparência do `Select.tsx`).
 *
 * Valor "" (vazio) = "Visão geral da agência" → submete sem cliente_id;
 * a action interpreta vazio como "limpar cookie e voltar para /admin".
 */
export function ClientFocusSwitcher({
  clientes,
  currentId,
  currentPathname,
}: ClientFocusSwitcherProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Ordena: ativos primeiro, depois alfabético.
  const sorted = [...clientes].sort((a, b) => {
    const sa = a.status === "ativo" ? 0 : 1;
    const sb = b.status === "ativo" ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return a.nome_empresa.localeCompare(b.nome_empresa, "pt-BR");
  });

  return (
    <form
      ref={formRef}
      action={setFocusedClienteAction}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="next" value={currentPathname} />
      <Eye
        className="h-4 w-4 text-royal-300 shrink-0 hidden sm:block"
        aria-hidden
      />
      <label className="sr-only" htmlFor="client-focus-switcher">
        Cliente em foco
      </label>
      <div className="max-w-[180px] sm:max-w-[240px]">
        <Select
          id="client-focus-switcher"
          name="cliente_id"
          defaultValue={currentId ?? ""}
          // Auto-submit quando muda — sem precisar de botão extra.
          onChange={(e) => {
            e.currentTarget.form?.requestSubmit();
          }}
          className="py-1.5 text-sm"
        >
          <option value="">Visão geral da agência</option>
          {sorted.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome_empresa}
              {c.status && c.status !== "ativo" ? ` · ${c.status}` : ""}
            </option>
          ))}
        </Select>
      </div>
      <noscript>
        <button type="submit" className="btn btn-secondary h-9 px-3">
          <ChevronDown className="h-4 w-4" />
          Trocar
        </button>
      </noscript>
    </form>
  );
}
