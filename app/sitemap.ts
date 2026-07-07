import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * sitemap.xml — apenas páginas públicas e estáveis.
 * Rotas autenticadas/dinâmicas são bloqueadas no robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE.url,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE.url}/login`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}