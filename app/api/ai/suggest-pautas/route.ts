import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { cliente, mes } = (await req.json()) as { cliente?: string; mes?: string };
  const mesLabel = mes ?? new Date().toLocaleDateString("pt-BR", { month: "long" });

  // Fallback dev sem chave
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      sugestoes: [
        { titulo: "Bastidores da equipe", copy: "Mostre os bastidores da sua operação e humanize a marca.", tipo: "post_feed" },
        { titulo: "Depoimento de cliente", copy: "Compartilhe um caso de sucesso em carrossel.", tipo: "carrossel" },
        { titulo: "Dica rápida em Reels", copy: "Dê uma dica útil ao seu público em formato curto.", tipo: "reels" },
        { titulo: "Pergunta nos Stories", copy: "Faça uma enquete para engajar os seguidores.", tipo: "story" },
        { titulo: "Post institucional de ${mesLabel}", copy: "Reforce a identidade da marca com um post visual marcante.", tipo: "post_feed" },
      ],
      dev: true,
    });
  }

  try {
    const prompt = `Sugira 5 pautas de conteúdo para ${cliente ?? "uma marca"} no mês de ${mesLabel}. Responda APENAS com um JSON array puro, sem markdown, com objetos {titulo, copy, tipo}, onde tipo ∈ {post_feed, story, reels, carrossel, video, artigo}.`;
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const json = (await r.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const sugestoes = JSON.parse(clean);
    return NextResponse.json({ ok: true, sugestoes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao gerar pautas" },
      { status: 500 }
    );
  }
}
