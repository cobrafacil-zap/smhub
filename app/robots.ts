import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * robots.txt gerado dinamicamente.
 * Permite indexação de rotas públicas e bloqueia áreas autenticadas
 * (painéis admin/cliente/super-admin, checkout, assinatura de contratos).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login"],
        disallow: [
          "/admin/",
          "/cliente/",
          "/super-admin/",
          "/checkout/",
          "/assinar-contrato/",
          "/ativar/",
          "/definir-senha/",
          "/auth/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}