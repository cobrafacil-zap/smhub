import { requireSuperAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Reveal } from "@/components/ui/motion/Reveal";
import { TiltCard } from "@/components/ui/motion/TiltCard";
import { TemplateViewButton } from "./TemplateViewButton";
import type { ContratoTemplate, VariavelContrato } from "@/types/database";

export const metadata = { title: "Templates de contrato" };

export default async function TemplatesContratoPage() {
  await requireSuperAdmin();
  const supabase = createAdminClient();
  const { data: ts } = await supabase
    .from("contrato_templates")
    .select("*")
    .order("created_at", { ascending: false });
  const list = (ts as ContratoTemplate[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates de contrato"
        description="Modelos de contrato disponíveis para todas as agências (globais) ou de uma agência específica."
        breadcrumbs={[{ href: "/super-admin", label: "Início" }, { label: "Templates" }]}
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="Nenhum template"
            description="Crie um template no módulo de admin/contratos/templates."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((t, i) => {
            const vars = (t.variaveis as VariavelContrato[] | null) ?? [];
            return (
              <Reveal key={t.id} delay={Math.min(i, 8) * 50}>
                <TiltCard>
                  <Card spotlight className="lift">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-100 truncate">{t.nome}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {t.descricao ?? "—"} • {formatDate(t.created_at)}
                        </p>
                      </div>
                      <Badge variant={t.is_global ? "brand" : "default"}>
                        {t.is_global ? "Global" : "Por agência"}
                      </Badge>
                    </div>
                    {vars.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                          Variáveis ({vars.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {vars.map((v) => (
                            <code
                              key={v.key}
                              className="text-[10px] bg-bg-elevated px-1.5 py-0.5 rounded text-royal-300"
                            >
                              {`{{${v.key}}}`}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-border">
                      <TemplateViewButton
                        nome={t.nome}
                        conteudo={t.conteudo}
                        variaveis={vars}
                      />
                    </div>
                  </Card>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
