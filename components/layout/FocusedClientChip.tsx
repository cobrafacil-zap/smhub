"use client";

import Link from "next/link";
import { Eye } from "lucide-react";

export interface FocusedClientChipProps {
  nomeEmpresa: string;
}

/**
 * Chip exibido no Topbar do /admin quando há um cliente em foco ativo.
 * Mostra o nome e um link rápido para retomar o trabalho em /cliente/*.
 * O id do cliente fica no cookie — não precisa ser passado via prop.
 */
export function FocusedClientChip({ nomeEmpresa }: FocusedClientChipProps) {
  return (
    <Link
      href="/cliente"
      className="hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium bg-royal-500/15 text-royal-200 border border-royal-500/30 hover:bg-royal-500/25 transition"
      title={`Continuar editando ${nomeEmpresa} (modo foco)`}
    >
      <Eye className="h-3.5 w-3.5" />
      <span className="max-w-[160px] truncate">Foco: {nomeEmpresa}</span>
    </Link>
  );
}
