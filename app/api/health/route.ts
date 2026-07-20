import { NextResponse } from "next/server";

// Rota pública e trivial pra keep-warm: um cron externo (cron-job.org,
// GitHub Actions, etc.) bate aqui a cada poucos minutos pra manter a função
// serverless da Vercel "quente" em gru1 e evitar o cold start de 7-10s que
// o usuário sentia ao entrar no app após um tempo parado.
//
// Não exige auth e não toca no banco — só confirma que a função booteou.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}