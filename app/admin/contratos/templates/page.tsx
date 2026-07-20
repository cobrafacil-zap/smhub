import { requireAgenciaAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, FileText } from "lucide-react";
import type { ContratoTemplate } from "@/types/database";
import { TemplateEditor } from "@/components/contracts/TemplateEditor";
import { criarTemplateAction } from "@/lib/actions/contrato-actions";
import { TemplateRow } from "./TemplateRow";

export const metadata = { title: "Templates de contrato" };

export default async function TemplatesPage() {
  const session = await requireAgenciaAdmin();
  const supabase = createAdminClient();
  const { data: templates } = await supabase
    .from("contrato_templates")
    .select("*")
    .or(`agencia_id.eq.${session.profile.agencia_id},is_global.eq.true`)
    .order("is_global", { ascending: false });
  const list = (templates as ContratoTemplate[] | null) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates de contrato"
        description="Crie e edite templates reutilizáveis para os contratos da sua agência."
        breadcrumbs={[
          { href: "/admin", label: "Início" },
          { href: "/admin/contratos", label: "Contratos" },
          { label: "Templates" },
        ]}
      />

      <Card>
        <h3 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-royal-300" />
          Criar novo template
        </h3>
        <TemplateEditor
          initialName=""
          initialContent="<h1>Contrato</h1>\n<p>CONTRATANTE: {{cliente.nome_empresa}}</p>\n<p>CONTRATADA: {{agencia.nome_fantasia}}</p>\n<h2>Cláusula 1ª — Do objeto</h2>\n<p>...</p>"
          initialVariaveis={[
            { key: "cliente.nome_empresa", label: "Nome da empresa do cliente", type: "string" },
            { key: "agencia.nome_fantasia", label: "Nome fantasia da agência", type: "string" },
          ]}
          onSave={async (data) => {
            "use server";
            const fd = new FormData();
            fd.set("nome", data.nome);
            fd.set("descricao", data.descricao);
            fd.set("conteudo", data.conteudo);
            fd.set("variaveis", JSON.stringify(data.variaveis));
            const res = await criarTemplateAction(fd);
            if (res?.error) throw new Error(res.error);
          }}
        />
      </Card>

      <div>
        <h3 className="text-base font-semibold text-slate-100 mb-3">Templates disponíveis</h3>
        {list.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="Nenhum template ainda"
              description="Crie seu primeiro template acima para começar a gerar contratos."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map((t) => (
              <TemplateRow key={t.id} template={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
