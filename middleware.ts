import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

// Rotas públicas (não exigem autenticação).
// NOTA: /auth/meta/callback (OAuth da Meta) NÃO está aqui — é auth-gated de
// propósito: se o admin não estiver logado, a própria rota redireciona para
// /login?next=<callback url> e o fluxo volta após o login.
const PUBLIC_PATHS = [
  "/", // landing page (LP de vendas) — aberta a visitantes não autenticados
  "/login",
  "/auth/callback",
  "/auth/signout",
  "/definir-senha",
  "/assinar-contrato",
  "/checkout",
  "/checkout/sucesso",
  "/checkout/falha",
  "/checkout/pendente",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Recursos estáticos e APIs: deixa passar (a API faz sua própria validação)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            for (const { name, value, options } of cookiesToSet) {
              request.cookies.set(name, value);
              if (options) {
                request.cookies.set({ name, value, ...options });
              }
            }
            response = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      }
    );

    // getUser() valida o token no servidor do Supabase E renova o access_token
    // quando expira (o setAll abaixo grava o cookie novo no response — é assim
    // que o refresh happens no Next, já que Server Components não gravam cookie).
    // Não trocar por getSession(): getSession só lê o cookie localmente e NÃO
    // renova o token → o usuário cairia da sessão depois de ~1h.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1) NÃO autenticado
    if (!user) {
      if (isPublic(pathname)) return response;
      // Em vez de mandar pra /login, manda pra LP de vendas ("/").
      // O botão "Entrar" da LP leva ao /login quando o visitante quiser.
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // 2) Busca o profile — super_admins e usuarios EM PARALELO (antes eram
    //    sequenciais: esperava super_admins p/ só então buscar usuarios).
    //    Service-role (bypassa RLS) pra evitar inconsistências no Edge.
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    let role: UserRole | null = null;
    let agenciaId: string | null = null;
    let ativo = true;

    const [
      { data: superAdm },
      { data: usuario },
    ] = await Promise.all([
      admin
        .from("super_admins")
        .select("ativo")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("usuarios")
        .select("role, agencia_id, ativo")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (superAdm) {
      role = "super_admin";
      ativo = superAdm.ativo ?? true;
    } else {
      if (!usuario) {
        // Sem profile → força logout via /auth/signout
        if (pathname === "/auth/signout") return response;
        const url = request.nextUrl.clone();
        url.pathname = "/auth/signout";
        return NextResponse.redirect(url);
      }
      role = usuario.role as UserRole;
      agenciaId = usuario.agencia_id;
      ativo = usuario.ativo ?? true;
    }

    if (!role) {
      if (pathname === "/auth/signout") return response;
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signout";
      return NextResponse.redirect(url);
    }

    if (ativo === false) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signout";
      return NextResponse.redirect(url);
    }

    // 3) Logado acessando /login → manda para o painel correto.
    //    A página "/" (landing page) fica acessível para qualquer um,
    //    inclusive usuários logados — a LP mostra um botão "Ir para o painel".
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      if (role === "super_admin") url.pathname = "/super-admin";
      else if (role === "admin_agencia" || role === "membro_equipe")
        url.pathname = "/admin";
      else url.pathname = "/cliente";
      return NextResponse.redirect(url);
    }

    // 4) Proteção por área
    if (pathname.startsWith("/super-admin") && role !== "super_admin") {
      const url = request.nextUrl.clone();
      if (role === "admin_agencia" || role === "membro_equipe")
        url.pathname = "/admin";
      else url.pathname = "/cliente";
      return NextResponse.redirect(url);
    }

    if (
      pathname.startsWith("/admin") &&
      role !== "admin_agencia" &&
      role !== "membro_equipe"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = role === "super_admin" ? "/super-admin" : "/cliente";
      return NextResponse.redirect(url);
    }

    // 4b) Áreas admin-only: membros da equipe NÃO acessam (defesa em profundidade,
    // além de esconder na nav). Cliente (role=cliente) já foi bloqueado acima.
    const ADMIN_ONLY_PREFIXOS = [
      "/admin/financeiro",
      "/admin/contratos",
      "/admin/relatorios",
      "/admin/equipe",
      "/admin/planos",
      "/admin/configuracoes",
    ];
    if (role === "membro_equipe" && ADMIN_ONLY_PREFIXOS.some((p) => pathname.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/tarefas";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/cliente") && role !== "cliente") {
      const url = request.nextUrl.clone();
      if (role === "super_admin") url.pathname = "/super-admin";
      else url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    // 5) Bloqueio de assinatura para admin/membros da agência
    if (
      (role === "admin_agencia" || role === "membro_equipe") &&
      agenciaId &&
      pathname.startsWith("/admin")
    ) {
      const { data: bloqueada } = await admin.rpc("is_agencia_bloqueada", {
        ag: agenciaId,
      });
      if (bloqueada) {
        // Libera apenas /admin/assinatura (tela de renovação)
        if (pathname === "/admin/assinatura") return response;
        const url = request.nextUrl.clone();
        url.pathname = "/admin/assinatura";
        url.searchParams.set("motivo", "vencida");
        return NextResponse.redirect(url);
      }
    }

    return response;
  } catch (err) {
    // Em caso de erro no middleware, deixa passar para evitar 500
    // (a página/rota faz sua própria validação de auth).
    console.error("[middleware] erro:", err);
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
