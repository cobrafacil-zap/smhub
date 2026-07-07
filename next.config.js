/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Imagens externas permitidas (logos, avatares)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
