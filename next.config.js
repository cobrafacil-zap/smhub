/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Imagens externas permitidas (logos, avatares)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  // Em produção, remove console.* (mantém error) do bundle do navegador —
  // menos ruído e bytes no client.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error"] }
        : false,
  },

  // Tree-shaking mais agressivo de libs que exportam muitos símbolos
  // (lucide-react exporta centenas de ícones; date-fns e recharts idem).
  // Reduz o First Load JS de páginas que importam dessas libs.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
};

module.exports = nextConfig;