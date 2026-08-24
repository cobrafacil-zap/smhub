"use client";

import { useRef } from "react";
import { setFocusedClienteAction } from "@/lib/actions/focus-actions";
import { ChevronDown, Eye } from "lucide-react";

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
 * Reusa o visual de Select.tsx (mesma classe `pr-9 appearance-none bg-[url(...)]`).
 * - "" (vazio) = "Visão geral da agência" → submit com `cliente_id` vazio
 *   deseleciona. Hoje a action aceita qualquer string; se for vazia,
 *   simplesmente redireciona sem cookie (re-define via clearFocusedClienteAction).
 * - Para evitar duas actions, mantemos uma única: se cliente_id vier vazio,
 *   interpretamos como "voltar para /admin".
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
      <select
        id="client-focus-switcher"
        name="cliente_id"
        defaultValue={currentId ?? ""}
        // Auto-submit quando muda — sem precisar botão extra. Em paralelo
        // existe um botão "Visão geral" no Topbar para o caso de o usuário
        // querer explicitamente sair (UX previsível).
        onChange={(e) => {
          // Pequeno delay para garantir que o value mais recente chegou.
          e.currentTarget.form?.requestSubmit();
        }}
        className="input pr-9 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%2394A3B8%22 stroke-width=%221.5%22><path d=%22M3 4.5 6 7.5 9 4.5%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat max-w-[180px] sm:max-w-[240px] py-1.5 text-sm"
      >
        <option value="">Visão geral da agência</option>
        {sorted.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome_empresa}
            {c.status && c.status !== "ativo" ? ` · ${c.status}` : ""}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="btn btn-secondary h-9 px-3">
          <ChevronDown className="h-4 w-4" />
          Trocar
        </button>
      </noscript>
    </form>
  );
}
