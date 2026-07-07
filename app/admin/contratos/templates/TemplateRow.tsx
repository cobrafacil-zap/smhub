"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TemplateEditor } from "@/components/contracts/TemplateEditor";
import { Pencil, Trash2, CopyPlus, FileText } from "lucide-react";
import {
  atualizarTemplateAction,
  deletarTemplateAction,
  duplicarTemplateAction,
} from "@/lib/actions/contrato-actions";
import { toast } from "@/components/ui/Toast";
import type { ContratoTemplate, VariavelContrato } from "@/types/database";

export function TemplateRow({ template }: { template: ContratoTemplate }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const variaveis = (Array.isArray(template.variaveis)
    ? (template.variaveis as unknown as VariavelContrato[])
    : []) ?? [];

  function duplicar() {
    startTransition(async () => {
      const res = await duplicarTemplateAction(template.id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Template duplicado para sua agência. Agora você pode editar.");
        router.refresh();
      }
    });
  }

  function excluir() {
    startTransition(async () => {
      const res = await deletarTemplateAction(template.id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Template excluído.");
        router.refresh();
      }
    });
  }

  async function salvar(data: {
    nome: string;
    descricao: string;
    conteudo: string;
    variaveis: VariavelContrato[];
  }) {
    const fd = new FormData();
    fd.set("nome", data.nome);
    fd.set("descricao", data.descricao);
    fd.set("conteudo", data.conteudo);
    fd.set("variaveis", JSON.stringify(data.variaveis));
    const res = await atualizarTemplateAction(template.id, fd);
    if (res?.error) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success("Template atualizado.");
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Card className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-100 truncate">{template.nome}</p>
            {template.is_global && <Badge variant="brand">Global</Badge>}
          </div>
          {template.descricao && (
            <p className="text-sm text-slate-400 mt-0.5 truncate">{template.descricao}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/admin/contratos/gerador?template=${template.id}`}>
            <Button size="sm" variant="secondary" iconLeft={<FileText className="h-3.5 w-3.5" />}>
              Usar
            </Button>
          </Link>
          {template.is_global ? (
            <Button
              size="sm"
              variant="ghost"
              loading={pending}
              onClick={duplicar}
              iconLeft={<CopyPlus className="h-3.5 w-3.5" />}
              title="Cria uma cópia editável na sua agência"
            >
              Duplicar
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing((v) => !v)}
                iconLeft={<Pencil className="h-3.5 w-3.5" />}
              >
                {editing ? "Fechar" : "Editar"}
              </Button>
              <ConfirmDialog
                trigger={
                  <Button
                    size="sm"
                    variant="ghost"
                    iconLeft={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Excluir
                  </Button>
                }
                title="Excluir template?"
                description="Esta ação não pode ser desfeita."
                confirmText="Excluir"
                variant="danger"
                onConfirm={excluir}
              />
            </>
          )}
        </div>
      </Card>

      {editing && !template.is_global && (
        <TemplateEditor
          initialName={template.nome}
          initialDescription={template.descricao ?? ""}
          initialContent={template.conteudo}
          initialVariaveis={variaveis}
          onSave={salvar}
          saving={pending}
        />
      )}
    </div>
  );
}