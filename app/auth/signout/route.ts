import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();
  const url = request.nextUrl.clone();
  // Após logout, volta pra LP de vendas (não pra /login).
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
