import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SITE } from "@/lib/site";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ThemeToaster } from "@/components/ui/ThemeToaster";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "SM Hub — Plataforma para Agências de Marketing",
    template: "%s · SM Hub",
  },
  description: SITE.description,
  keywords: [
    "agência de marketing",
    "gestão de clientes",
    "planejamento editorial",
    "calendário editorial",
    "relatórios de mídias sociais",
    "relatórios de Instagram",
    "contratos digitais",
    "assinatura eletrônica",
    "faturas",
    "financeiro de agência",
    "portal do cliente",
    "software para agência de marketing",
    "SM Hub",
  ],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  applicationName: SITE.name,
  category: "Business Software",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/opengraph-image"],
    creator: SITE.twitter,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icon",
    shortcut: "/icon",
  },
  // PWA — iOS "Adicionar à Tela de Início". apple-touch-icon vem do
  // app/apple-icon.tsx (convention) e o manifest do app/manifest.ts.
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1A40",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen bg-bg text-slate-100">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <ScrollToTop />
          {children}
          <GlobalLoader />
          <RegisterSW />
          <ThemeToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
