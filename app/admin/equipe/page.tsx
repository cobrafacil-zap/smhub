import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserCog, Plus, Mail, Briefcase, DollarSign, Building2, GitFork } from "lucide-react";
import { cn, formatBRL, formatDate } from "@/lib/utils";
import { ExcluirEquipeButton } from "./ExcluirEquipeButton";
import { EditarEquipeButton } from "./EditarEquipeButton";
import type { Usuario } from "@/types/database";

export const metadata = { title: "Equipe" };

type View = "cards" | "organograma";

function roleLabel(role: string) {
  if (role === "admin_agencia") return "Admin";
  if (role === "cliente") return "Cliente";
  return "Equipe";
}
function roleVariant(role: string): "brand" | "default" | "warning" {
  if (role === "admin_agencia") return "brand";
  if (role === "cliente") return "warning";
  return "default";
}

export default async function EquipePage({
  searchParams,
}: {
  searchParams: { role?: string; view?: string };
}) {
  const session = await requireAgenciaMember();
  const supabase = createAdminClient();
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nome, email, role, ativo, cargo, custo_mensal, created_at, user_id, supervisor_id")
    .eq("agencia_id", session.profile.agencia_id!)
    .order("created_at", { ascending: false });
  const all = (usuarios as Usuario[] | null) ?? [];

  // Filtro por papel (?role=admin|membro_equipe|cliente)
  const filtro = searchParams.role;
  const list = filtro
    ? all.filter((u) => u.role === filtro)
    : all;

  // Contagens por papel (para as tabs de filtro)
  const counts = {
    todos: all.length,
    admin_agencia: all.filter((u) => u.role === "admin_agencia").length,
    membro_equipe: all.filter((u) => u.role === "membro_equipe").length,
    cliente: all.filter((u) => u.role === "cliente").length,
  };

  // Custo total mensal da equipe (soma dos custos dos membros ativos — exclui clientes)
  const custoTotal = all
    .filter((u) => u.ativo && u.role !== "cliente")
    .reduce((acc, u) => acc + (u.custo_mensal ?? 0), 0);

  // Mapa id -> nome (para mostrar "Responde a")
  const nomeById = new Map(all.map((u) => [u.id, u.nome ?? u.email ?? "—"]));

  const view: View = searchParams.view === "organograma" ? "organograma" : "cards";

  // Organograma: só membros da equipe (admin/membro), agrupados por supervisor
  const equipeMembros = all.filter((u) => u.role !== "cliente");
  const filhos = new Map<string, Usuario[]>();
  for (const u of equipeMembros) {
    const s = u.supervisor_id ?? "";
    if (!s) continue;
    (filhos.get(s) ?? filhos.set(s, []).get(s)!).push(u);
  }
  const raizes = equipeMembros.filter(
    (u) => !u.supervisor_id || !equipeMembros.some((m) => m.id === u.supervisor_id)
  );

  function renderNo(u: Usuario, nivel: number): React.ReactNode {
    const kids = filhos.get(u.id) ?? [];
    return (
      <div key={u.id} style={{ marginLeft: nivel * 20 }} className="space-y-1.5">
        <div className="flex items-center gap-2 card !p-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-royal-500 to-navy-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {(u.nome ?? u.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-100 truncate">{u.nome ?? "—"}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {u.cargo?.trim() ? u.cargo : roleLabel(u.role)}
            </p>
          </div>
          <Badge variant={roleVariant(u.role)}>{roleLabel(u.role)}</Badge>
        </div>
        {kids.length > 0 && <div className="space-y-1.5">{kids.map((k) => renderNo(k, nivel + 1))}</div>}
      </div>
    );
  }

  const tabs: { key: string; label: string; count: number }[] = [
    { key: "", label: "Todos", count: counts.todos },
    { key: "admin_agencia", label: "Admin", count: counts.admin_agencia },
    { key: "membro_equipe", label: "Equipe", count: counts.membro_equipe },
    { key: "cliente", label: "Cliente", count: counts.cliente },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        description="Gerencie os membros da sua agência e o organograma."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Equipe" }]}
        actions={
          <Link href="/admin/equipe/novo">
            <Button iconLeft={<Plus className="h-4 w-4" />}>Convidar membro</Button>
          </Link>
        }
      />

      {/* Resumo de custo da equipe */}
      {all.length > 0 && (
        <Card className="!p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-royal-500/15 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-royal-300" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Custo mensal da equipe</p>
                <p className="text-lg font-semibold text-slate-100">{formatBRL(custoTotal)}</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs text-right">
              Soma dos custos dos membros ativos (sem clientes). Configure cada um em
              <strong className="text-slate-300"> Editar</strong>.
            </p>
          </div>
        </Card>
      )}

      {all.length === 0 ? (
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
        <>
          {/* Filtro por papel + alternador de visão */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 border-b border-border overflow-x-auto">
              {tabs.map((t) => {
                const active = (filtro ?? "") === t.key;
                const href = t.key
                  ? `/admin/equipe?role=${t.key}${view !== "cards" ? `&view=${view}` : ""}`
                  : `/admin/equipe${view !== "cards" ? `?view=${view}` : ""}`;
                return (
                  <Link
                    key={t.key || "todos"}
                    href={href}
                    className={cn(
                      "px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap inline-flex items-center gap-2",
                      active
                        ? "border-royal-500 text-royal-300"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {t.label}
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-bg-muted text-slate-400">
                      {t.count}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              <Link
                href={`/admin/equipe${filtro ? `?role=${filtro}` : ""}`}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md border transition",
                  view === "cards"
                    ? "bg-royal-500/15 text-royal-200 border-royal-500/40"
                    : "border-border text-slate-400 hover:text-slate-200"
                )}
              >
                Cards
              </Link>
              <Link
                href={`/admin/equipe?view=organograma${filtro ? `&role=${filtro}` : ""}`}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md border transition inline-flex items-center gap-1",
                  view === "organograma"
                    ? "bg-royal-500/15 text-royal-200 border-royal-500/40"
                    : "border-border text-slate-400 hover:text-slate-200"
                )}
              >
                <GitFork className="h-3 w-3" /> Organograma
              </Link>
            </div>
          </div>

          {view === "organograma" ? (
            <Card className="!p-4 space-y-2">
              {equipeMembros.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum membro de equipe para exibir no organograma.</p>
              ) : raizes.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  Não foi possível montar a árvore (possível ciclo de supervisores). Verifique os vínculos em Editar.
                </p>
              ) : (
                <>
                  {raizes.map((u) => renderNo(u, 0))}
                  <p className="text-[11px] text-slate-500 pt-2">
                    Defina quem responde a quem em <strong className="text-slate-300">Editar</strong> →
                    "Responde a". Clientes não aparecem no organograma.
                  </p>
                </>
              )}
            </Card>
          ) : list.length === 0 ? (
            <Card>
              <EmptyState
                icon={<UserCog className="h-10 w-10" />}
                title="Nenhum resultado"
                description="Nenhum membro com esse filtro."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((u) => {
                const isCliente = u.role === "cliente";
                const supervisorNome = u.supervisor_id ? nomeById.get(u.supervisor_id) ?? null : null;
                return (
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
                          <Badge variant={roleVariant(u.role)}>{roleLabel(u.role)}</Badge>
                          <Badge variant={u.ativo ? "success" : "danger"}>
                            {u.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Função + Custo mensal (apenas para membros da equipe) */}
                    {!isCliente && (
                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                          <span className="truncate">
                            {u.cargo?.trim() ? u.cargo : <span className="text-slate-500 italic">Sem função</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <DollarSign className="h-3.5 w-3.5 text-slate-500" />
                          <span>
                            {u.custo_mensal && u.custo_mensal > 0 ? (
                              <>
                                <span className="text-royal-300 font-medium">{formatBRL(u.custo_mensal)}</span>
                                {" "}/ mês
                              </>
                            ) : (
                              <span className="text-slate-500 italic">Custo não definido</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <GitFork className="h-3.5 w-3.5 text-slate-500" />
                          <span className="truncate">
                            {supervisorNome ? (
                              <>Responde a <strong className="text-slate-200">{supervisorNome}</strong></>
                            ) : (
                              <span className="text-slate-500 italic">Sem supervisor</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      <p className="text-[10px] text-slate-500">Desde {formatDate(u.created_at)}</p>
                      {isCliente ? (
                        <Link
                          href="/admin/clientes"
                          className="text-[11px] text-royal-300 hover:text-royal-200 inline-flex items-center gap-1"
                        >
                          <Building2 className="h-3 w-3" /> Gerenciado em Clientes
                        </Link>
                      ) : (
                        <div className="flex items-center gap-1">
                          {u.user_id !== session.id && (
                            <EditarEquipeButton
                              id={u.id}
                              nome={u.nome ?? ""}
                              cargo={u.cargo}
                              custoMensal={u.custo_mensal}
                              role={u.role}
                              supervisorId={u.supervisor_id}
                              membros={equipeMembros
                                .filter((m) => m.id !== u.id)
                                .map((m) => ({ id: m.id, nome: m.nome ?? m.email ?? "—" }))}
                            />
                          )}
                          {u.user_id !== session.id && u.role !== "admin_agencia" && (
                            <ExcluirEquipeButton id={u.id} nome={u.nome ?? u.email ?? "membro"} />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mensagens específicas */}
                    {u.role === "admin_agencia" && u.user_id !== session.id && !isCliente && (
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
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}