import { cache } from "react";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
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
 *
 * Envolvida em React `cache()`: o layout e a page de cada rota chamam
 * `requireAgenciaMember`/`requireUser` independentemente — sem cache, isso
 * roda a cadeia de auth 2x por request (6-8 round-trips sequenciais). Com
 * cache, a primeira chamada resolve e as demais reusam o resultado na mesma
 * requisição. Além disso, `super_admins` e `usuarios` rodam EM PARALELO
 * (antes eram sequenciais: esperava o super_admins p/ só então buscar
 * usuarios). Isso corta a maior parte do tempo de carga percebido.
 */
// PERF: o profile (super_admins/usuarios) e o registro do cliente mudam raramente.
// Buscar em TODO request de página somava 2-3 round-trips ao DB por navegação.
// unstable_cache guarda o resultado em memória (next start) por 30s, chaveado
// pelo user.id — que já foi verificado por getUser() em getSessionUser, então a
// chave é confiável (não há risco de vazar perfil entre usuários). A verificação
// de sessão (getUser, rede) continua autoritativa; só o PROFILE é cacheado.
// Para invalidar antes dos 30s (mudança de role/ativo), chame
// revalidateTag("session-profile") na server action que editar usuarios.
const loadProfile = unstable_cache(
  async (userId: string) => {
    const admin = createAdminClient();
    const [{ data: superAdm }, { data: usuario, error }] = await Promise.all([
      admin
        .from("super_admins")
        .select("id, user_id, nome, email, ativo")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("usuarios")
        .select("id, user_id, nome, email, role, agencia_id, ativo")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    // Serializa o erro (unstable_cache exige retorno JSON-serializável).
    return { superAdm, usuario, errorMessage: error?.message ?? null };
  },
  ["session-profile-v1"],
  { revalidate: 30, tags: ["session-profile"] }
);

const loadCliente = unstable_cache(
  async (userId: string) => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("clientes")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as Cliente | null) ?? null;
  },
  ["session-cliente-v1"],
  { revalidate: 30, tags: ["session-profile"] }
);

// PERF/JWT: em vez de chamar supabase.auth.getUser() (round-trip à API de
// Auth a cada navegação), verificamos o JWT do cookie LOCALMENTE com a lib
// `jose` usando o JWT secret do Supabase (HS256). Isso é criptográfico: um
// token forjado/tampered FALHA na verificação de assinatura — então o user.id
// que vem daqui é confiável pra escopar as queries do admin client (bypassa
// RLS). Só caímos em getUser() (rede, que também renova o token) quando o
// token expirou/inválido — caso normal a cada ~1h.
//
// Requer a env SUPABASE_JWT_SECRET (painel do Supabase → Settings → API →
// JWT Secret). Sem ela, cai pro caminho antigo (getUser sempre).
let _jwtKey: Uint8Array | null | undefined;
function jwtKey(): Uint8Array | null {
  if (_jwtKey !== undefined) return _jwtKey;
  const secret = process.env.SUPABASE_JWT_SECRET;
  _jwtKey = secret ? new TextEncoder().encode(secret) : null;
  return _jwtKey;
}

type VerifiedUser = { id: string; email: string | null };

async function getVerifiedUser(supabase: ReturnType<typeof createClient>): Promise<VerifiedUser | null> {
  // getSession() lê/decodifica o cookie localmente (sem rede).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token || !session.user) return null;
  const key = jwtKey();
  if (!key) return null; // sem secret configurado → não verifica localmente
  try {
    await jwtVerify(session.access_token, key, {
      algorithms: ["HS256"],
      clockTolerance: 60, // tolera 60s de skew de relógio
    });
    return { id: session.user.id, email: session.user.email ?? null };
  } catch {
    // expirado/inválido → deixa o chamador cair em getUser() (renova).
    return null;
  }
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const supabase = createClient();
    // Caminho feliz (token válido): verificação local, SEM rede.
    let user: VerifiedUser | null = await getVerifiedUser(supabase);
    if (!user) {
      // Fallback: token expirado/ausente ou JWT secret não config. getUser()
      // valida no servidor do Supabase E renova o token (o middleware grava
      // o cookie novo). Custo de rede só aqui — ~1x por hora por sessão.
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) return null;
      user = { id: u.id, email: u.email ?? null };
    }

    // Profile cacheado (30s) — depois do primeiro acesso sai da memória em
    // vez de 2 round-trips ao DB. user.id é o verificado por getUser().
    const { superAdm, usuario, errorMessage } = await loadProfile(user.id);

    let role: UserRole | null = null;
    let profileData: {
      id: string;
      user_id: string;
      nome: string;
      email: string;
      agencia_id: string | null;
      ativo: boolean;
    } | null = null;

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
      if (errorMessage) {
        console.error("[getSessionUser] erro ao buscar usuario:", errorMessage);
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

    // Cliente também cacheado (30s) — só busca pra role=cliente.
    let cliente: Cliente | null = null;
    if (role === "cliente") {
      cliente = await loadCliente(user.id);
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
});

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
