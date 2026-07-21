import Link from "next/link";
import { requireAgenciaMember } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users, Plus } from "lucide-react";
import type { Cliente, Fatura } from "@/types/database";
import { ClienteCard } from "./ClienteCard";
import { CLIENTE_SEGMENTOS } from "@/lib/constants";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { status?: string; segmento?: string; busca?: string };
}) {
  const session = await requireAgenciaMember();
  // Leituras service-role (bypassa RLS). Ambas as queries filtram por
  // .eq("agencia_id", aid) — aid vem de requireAgenciaMember (sessão validada).
  const supabase = createAdminClient();
  const aid = session.profile.agencia_id!;
  const readOnly = session.profile.role === "membro_equipe";

  // Janela de faturas: 6 meses atrás + futuras. Evita varrer histórico
  // antigo (a lógica do card só precisa de atrasadas recentes + próximas).
  const hoje = new Date();
  const hojeStr = hoje.toISOString().slice(0, 10);
  const limiteStr = new Date(hoje.getTime() + 5 * 86400000).toISOString().slice(0, 10);
  const inicioMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1)
    .toISOString()
    .slice(0, 10);

  let query = supabase
    .from("clientes")
    // Só colunas usadas pelo ClienteCard — menos payload do Postgres.
    .select("id, nome_empresa, nome_responsavel, email, telefone, segmento, status, valor_mensal, created_at")
    .eq("agencia_id", aid)
    .order("created_at", { ascending: false })
    .limit(300);

  if (searchParams.status) query = query.eq("status", searchParams.status as Cliente["status"]);
  if (searchParams.segmento) query = query.eq("segmento", searchParams.segmento);
  if (searchParams.busca) query = query.ilike("nome_empresa", `%${searchParams.busca}%`);

  // Roda clientes e faturas EM PARALELO (antes eram sequenciais → dobro do tempo).
  const [clientesRes, faturasRes] = await Promise.all([
    query,
    supabase
      .from("faturas")
      .select("id, cliente_id, data_vencimento, valor, status, numero")
      .eq("agencia_id", aid)
      .neq("status", "pago")
      .gte("data_vencimento", inicioMesPassado)
      .order("data_vencimento", { ascending: true })
      .limit(500),
  ]);
  const list = (clientesRes.data as Cliente[] | null) ?? [];

  // Faturas dos clientes: identificamos
  // (a) próxima fatura por cliente
  // (b) contagem de faturas atrasadas (status=atrasado OU pendente com data passada)
  // (c) contagem de faturas a vencer nos próximos 5 dias
  const todasFaturas = (faturasRes.data as (Fatura & { cliente_id: string })[] | null) ?? [];

  const proxFaturaPorCliente = new Map<string, Fatura & { cliente_id: string }>();
  const atrasadasPorCliente = new Map<string, number>();
  const aVencerPorCliente = new Map<string, number>();
  for (const f of todasFaturas) {
    if (!proxFaturaPorCliente.has(f.cliente_id)) proxFaturaPorCliente.set(f.cliente_id, f);
    const vencida = f.status === "atrasado" || (f.status === "pendente" && f.data_vencimento < hojeStr);
    if (vencida) {
      atrasadasPorCliente.set(f.cliente_id, (atrasadasPorCliente.get(f.cliente_id) ?? 0) + 1);
    } else if (f.status === "pendente" && f.data_vencimento >= hojeStr && f.data_vencimento <= limiteStr) {
      aVencerPorCliente.set(f.cliente_id, (aVencerPorCliente.get(f.cliente_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes da sua agência."
        breadcrumbs={[{ href: "/admin", label: "Início" }, { label: "Clientes" }]}
        actions={
          readOnly ? undefined : (
            <Link href="/admin/clientes/novo">
              <Button iconLeft={<Plus className="h-4 w-4" />}>Novo cliente</Button>
            </Link>
          )
        }
      />

      <form className="flex flex-wrap items-end gap-3 p-4 bg-bg-surface border border-border rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Buscar</label>
          <input
            className="input"
            name="busca"
            defaultValue={searchParams.busca}
            placeholder="Nome da empresa..."
          />
        </div>
        <div className="w-40">
          <label className="label">Status</label>
          <select className="input" name="status" defaultValue={searchParams.status ?? ""}>
            <option value="">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="pausado">Pausado</option>
          </select>
        </div>
        <div className="w-48">
          <label className="label">Segmento</label>
          <select className="input" name="segmento" defaultValue={searchParams.segmento ?? ""}>
            <option value="">Todos</option>
            {CLIENTE_SEGMENTOS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-secondary h-[40px]">Filtrar</button>
      </form>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="Nenhum cliente encontrado"
            description={readOnly ? "Ainda não há clientes para mostrar." : "Cadastre seu primeiro cliente para começar."}
            action={
              readOnly ? undefined : (
                <Link href="/admin/clientes/novo">
                  <Button iconLeft={<Plus className="h-4 w-4" />}>Novo cliente</Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <ClienteCard
              key={c.id}
              cliente={{
                ...c,
                proximaFatura: proxFaturaPorCliente.get(c.id) ?? null,
                faturasAtrasadasCount: atrasadasPorCliente.get(c.id) ?? 0,
                faturasAVencerCount: aVencerPorCliente.get(c.id) ?? 0,
              }}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}
