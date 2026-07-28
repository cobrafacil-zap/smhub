import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Building2, ExternalLink } from "lucide-react";
import type { EmpresaReferencia } from "@/types/database";

/**
 * Card read-only (visão da agência) das empresas de referência que a cliente
 * preencheu em "Minha conta". A agência não edita aqui — só consulta.
 */
export function EmpresasReferenciaCard({
  referencias,
}: {
  referencias: EmpresaReferencia[];
}) {
  const lista = (referencias ?? []).filter((r) => r && typeof r.nome === "string" && r.nome.trim());
  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-1">
        <Building2 className="h-4 w-4 text-royal-300" />
        Empresas de referência
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        Marcas que a cliente admira e que servem de inspiração para o conteúdo. Preenchido pela
        própria cliente em "Minha conta".
      </p>

      {lista.length === 0 ? (
        <p className="text-sm text-slate-500 italic">Nenhuma referência cadastrada pela cliente.</p>
      ) : (
        <div className="space-y-2">
          {lista.map((r, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-bg-elevated/40 p-3 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-100 text-sm">{r.nome}</p>
                {r.url && (
                  <a
                    href={r.url.startsWith("http") ? r.url : `https://${r.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-royal-300 hover:underline inline-flex items-center gap-1 truncate max-w-[220px]"
                  >
                    {r.url} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
              </div>
              {r.motivo && (
                <Badge variant="default" className="!text-[10px] !font-normal !bg-bg-elevated">
                  {r.motivo}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}