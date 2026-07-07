/**
 * Configuração central do site — usada para SEO (metadataBase,
 * canonical, OpenGraph, sitemap, robots, JSON-LD).
 *
 * A URL base vem de NEXT_PUBLIC_APP_URL (definida no .env.local).
 * Fallback para localhost em dev.
 */
export const SITE = {
  name: "SM Hub",
  tagline: "Plataforma para Agências de Marketing",
  description:
    "Gestão completa para agências de marketing: clientes, planejamento editorial, relatórios de mídias sociais, financeiro, contratos digitais e portal do cliente. Teste grátis por 7 dias.",
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  ),
  locale: "pt_BR",
  twitter: "@smhub",
  email: "contato@smhub.com.br",
  // Contato de suporte exibido no dashboard (Olá, ...). Configurável via env.
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "contato@smhub.com.br",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "",
};

/** Rotas públicas que fazem sentido indexar / listar no sitemap. */
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/checkout",
] as const;