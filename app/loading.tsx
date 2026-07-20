// Sem fallback de loading no root. Antes havia um spinner tela-cheia
// "Carregando…" que ficava preso durante cold starts do serverless da Vercel
// (7-10s) — pior que a tela em branco, porque parecia travado. Sem fallback,
// o navegador mostra só o indicador nativo de navegação durante o boot da
// função. O usuário pediu pra remover as telas de carregar.
export default function Loading() {
  return null;
}