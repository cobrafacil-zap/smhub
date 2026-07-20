import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserCog, Plus, Mail, Briefcase, DollarSign } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";
import { ExcluirEquipeButton } from "./ExcluirEquipeButton";
import { EditarEquipeButton } from "./EditarEquipeButton";
import type { Usuario } from "@/types/database";

export const metadata = { title: "Equipe" };

export default async function EquipePage() {
  const session = await requireAgenciaMember();
  const supabase = createAdminClient();
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nome, email, role, ativo, cargo, custo_mensal, created_at, user_id")
    .eq("agencia_id", session.profile.agencia_id!)
    .order("created_at", { ascending: false });
  const list = (usuarios as Usuario[] | null) ?? [];

  // Custo total mensal da equipe (soma dos custos dos membros ativos)
  const custoTotal = list
    .filter((u) => u.ativo)
    .reduce((acc, u) => acc + (u.custo_mensal ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        description="Gerencie os membros da sua agência."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Equipe" }]}
        actions={
          <Link href="/admin/equipe/novo">
            <Button iconLeft={<Plus className="h-4 w-4" />}>Convidar membro</Button>
          </Link>
        }
      />

      {/* Resumo de custo da equipe */}
      {list.length > 0 && (
        <Card className="!p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-royal-500/15 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-royal-300" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Custo mensal da equipe</p>
                <p className="text-lg font-semibold text-slate-100">
                  {formatBRL(custoTotal)}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs text-right">
              Soma dos custos dos membros ativos. Configure cada um clicando em
              <strong className="text-slate-300"> Editar</strong> no card.
            </p>
          </div>
        </Card>
      )}

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UserCog className="h-10 w-10" />}
            title="Nenhum membro"
            description="Convide pessoas para sua equipe."
            action={
              <Link href="/admin/equipe/novo">
                <Button iconLeft={<Plus className="h-4 w-4" />}>Convidar membro</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((u) => (
            <Card key={u.id}>
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-royal-500 to-navy-700 flex items-center justify-center text-white font-semibold">
                  {(u.nome ?? u.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 truncate">{u.nome ?? "—"}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" /> {u.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant={u.role === "admin_agencia" ? "brand" : "default"}>
                      {u.role === "admin_agencia" ? "Admin" : "Equipe"}
                    </Badge>
                    <Badge variant={u.ativo ? "success" : "danger"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Função + Custo mensal */}
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                  <span className="truncate">
                    {u.cargo?.trim() ? u.cargo : <span className="text-slate-500 italic">Sem função definida</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <DollarSign className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    {u.custo_mensal && u.custo_mensal > 0
                      ? (
                        <>
                          <span className="text-royal-300 font-medium">{formatBRL(u.custo_mensal)}</span>
                          {" "}/ mês
                        </>
                      )
                      : <span className="text-slate-500 italic">Custo não definido</span>}
                  </span>
                </div>
              </div>

              {/* Ações: editar / excluir */}
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <p className="text-[10px] text-slate-500">
                  Desde {formatDate(u.created_at)}
                </p>
                <div className="flex items-center gap-1">
                  {u.user_id !== session.id && (
                    <EditarEquipeButton
                      id={u.id}
                      nome={u.nome ?? ""}
                      cargo={u.cargo}
                      custoMensal={u.custo_mensal}
                      role={u.role}
                    />
                  )}
                  {u.user_id !== session.id && u.role !== "admin_agencia" && (
                    <ExcluirEquipeButton id={u.id} nome={u.nome ?? u.email ?? "membro"} />
                  )}
                </div>
              </div>

              {/* Mensagens específicas */}
              {u.role === "admin_agencia" && u.user_id !== session.id && (
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  Outro admin — você pode editar a função/custo, mas não excluir.
                </p>
              )}
              {u.user_id === session.id && (
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  Você não pode editar/excluir a si mesmo por aqui.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
