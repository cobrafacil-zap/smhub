import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { criarPreferenceInterno } from "@/lib/assinatura-checkout";

const bodySchema = z.object({
  plano: z.enum(["basico", "pro", "enterprise"]),
  dados: z
    .object({
      nome: z.string().min(2),
      email: z.string().email(),
      telefone: z.string().optional().nullable(),
      nomeAgencia: z.string().min(2),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const result = await criarPreferenceInterno({
    plano: parsed.data.plano,
    dados: parsed.data.dados,
  });

  if (!result) {
    return NextResponse.json({ error: "Erro ao processar." }, { status: 500 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ initPoint: result.initPoint });
}
