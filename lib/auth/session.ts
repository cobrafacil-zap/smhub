import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente, SessionProfile, UserRole } from "@/types/database";

export type SessionUser = {
  id: string; // auth.users.id
  email: string | null;
  profile: SessionProfile;
  /** Cliente vinculado (se role=cliente e houver clientes.user_id=auth.uid()). */
  cliente: Cliente | null;
};

/**
 * Carrega o usuário autenticado + profile + cliente (se aplicável).
 * Retorna null se não houver sessão ou se o profile estiver inconsistente.
 *
 * Super-admins ficam APENAS em `super_admins` (não em `usuarios`).
 * Demais roles ficam em `usuarios`.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // 1) Primeiro checa se é super-admin (tabela dedicada, bypassa RLS
    //    via service-role para não cair em loop de policy).
    let role: UserRole | null = null;
    let profileData: {
      id: string;
      user_id: string;
      nome: string;
      email: string;
      agencia_id: string | null;
      ativo: boolean;
    } | null = null;

    const admin = createAdminClient();
    const { data: superAdm } = await admin
      .from("super_admins")
      .select("id, user_id, nome, email, ativo")
      .eq("user_id", user.id)
      .maybeSingle();

    if (superAdm) {
      role = "super_admin";
      profileData = {
        id: superAdm.id,
        user_id: superAdm.user_id,
        nome: superAdm.nome,
        email: superAdm.email,
        agencia_id: null,
        ativo: superAdm.ativo ?? true,
      };
    } else {
      // 2) Senão, busca em `usuarios`. Usa admin client (service-role) para
      //    evitar inconsistências de RLS no Edge (loop em policies ou subquery lenta).
      const { data: usuario, error } = await admin
        .from("usuarios")
        .select("id, user_id, nome, email, role, agencia_id, ativo")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[getSessionUser] erro ao buscar usuario:", error.message);
        return null;
      }
      if (!usuario) return null;
      if (!usuario.ativo) return null;

      role = usuario.role as UserRole;
      profileData = {
        id: usuario.id,
        user_id: usuario.user_id,
        nome: usuario.nome,
        email: usuario.email,
        agencia_id: usuario.agencia_id,
        ativo: usuario.ativo ?? true,
      };
    }

    if (!role || !profileData) return null;

    // Se for cliente, busca o registro na tabela clientes
    let cliente: Cliente | null = null;
    if (role === "cliente") {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      cliente = (data as Cliente | null) ?? null;
    }

    const profile: SessionProfile = {
      id: profileData.id,
      user_id: profileData.user_id,
      nome: profileData.nome,
      email: profileData.email,
      role,
      agencia_id: profileData.agencia_id,
      cliente_id: cliente?.id ?? null,
      ativo: profileData.ativo,
    };

    return {
      id: user.id,
      email: user.email ?? null,
      profile,
      cliente,
    };
  } catch (err) {
    console.error("[getSessionUser] exception:", err);
    return null;
  }
}

/** Exige usuário logado. Redireciona para a LP de vendas ("/") caso contrário. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return session;
}

/** Exige super-admin. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.profile.role !== "super_admin") redirect("/admin");
  return session;
}

/** Exige admin de agência (ou membro de equipe). */
export async function requireAgenciaMember(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.profile.role !== "admin_agencia" && session.profile.role !== "membro_equipe") {
    redirect(session.profile.role === "super_admin" ? "/super-admin" : "/cliente");
  }
  if (!session.profile.agencia_id) redirect("/login");
  return session;
}

/** Exige admin de agência (proprietário). */
export async function requireAgenciaAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.profile.role !== "admin_agencia") {
    redirect(session.profile.role === "super_admin" ? "/super-admin" : "/cliente");
  }
  if (!session.profile.agencia_id) redirect("/login");
  return session;
}

/** Exige cliente. */
export async function requireCliente(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.profile.role !== "cliente") redirect("/admin");
  if (!session.profile.cliente_id) redirect("/login");
  return session;
}
