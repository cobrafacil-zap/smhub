import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/contratos/[id]/pdf
 *
 * LEGADO: o "Baixar PDF" agora abre `/[admin|cliente]/contratos/[id]/imprimir`,
 * que é uma view HTML formatada A4. Esta rota é mantida apenas para
 * retrocompatibilidade e sempre redireciona para a página de impressão.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let basePath = "/admin/contratos";
  if (user) {
    // Detecta se é cliente para mandar pro lugar certo
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (usuario?.role === "cliente") {
      basePath = "/cliente/contratos";
    }
  }

  const printUrl = new URL(`${basePath}/${params.id}/imprimir`, request.url);
  return NextResponse.redirect(printUrl, { status: 302 });
}
