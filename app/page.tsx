import Link from "next/link";
import {
  ArrowRight,
  LayoutDashboard,
  Check,
  ShieldCheck,
  Zap,
  Clock,
  Star,
  Plus,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPlanos } from "@/lib/planos";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlanoCard, PLANO_FEATURES } from "@/components/billing/PlanoCard";
import { EcossistemaMarquee } from "@/components/landing/EcossistemaMarquee";
import { FeaturesTimeline } from "@/components/landing/FeaturesTimeline";
import { Hero3D } from "@/components/landing/Hero3D";
import { InteractiveShowcase } from "@/components/landing/InteractiveShowcase";
import { HeroEmojiField } from "@/components/landing/HeroEmojiField";
import { StepsSection } from "@/components/landing/StepsSection";
import { HeroStars } from "@/components/landing/HeroStars";
import { Reveal } from "@/components/ui/motion/Reveal";
import { SITE } from "@/lib/site";
import type { Metadata } from "next";
import type { Plano, PlanoConfig, UserRole } from "@/types/database";

// A LP consome dados dinâmicos (planos) e roda server-side; força render dinâmico.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SM Hub — Plataforma para Agências de Marketing",
  description:
    "Gestão completa para agências de marketing: clientes, planejamento editorial, relatórios, financeiro, contratos digitais e portal do cliente. Teste grátis por 7 dias, sem cartão de crédito.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "SM Hub — Plataforma para Agências de Marketing",
    description:
      "Gestão completa para agências de marketing em um só lugar. Teste grátis por 7 dias.",
    url: SITE.url,
  },
};

const STATS = [
  { value: "7 dias", label: "de teste grátis", icon: Clock },
  { value: "+50%", label: "mais produtividade", icon: Zap },
  { value: "6 em 1", label: "ferramentas integradas", icon: Star },
  { value: "100%", label: "seguro e em nuvem", icon: ShieldCheck },
];

const STEPS = [
  {
    n: "01",
    title: "Crie sua conta",
    desc: "Cadastre-se em segundos e comece seu trial de 7 dias sem cartão de crédito.",
  },
  {
    n: "02",
    title: "Importe seus clientes",
    desc: "Adicione clientes, equipe e configure planejamentos editoriais em poucos cliques.",
  },
  {
    n: "03",
    title: "Entregue mais resultados",
    desc: "Gere relatórios, contratos e faturas automáticas. Tudo centralizado em um só lugar.",
  },
];

const DEPOIMENTOS = [
  {
    nome: "Mariana Souza",
    cargo: "Diretora, Agência Pulsar",
    texto:
      "A SM Hub transformou nossa operação. Antes, controlávamos clientes em planilhas; agora tudo está em um só lugar.",
    iniciais: "MS",
  },
  {
    nome: "Rafael Mendes",
    cargo: "Sócio, Bendito Marketing",
    texto:
      "Os relatórios automáticos economizaram 8 horas por mês da equipe. Os clientes amam o portal.",
    iniciais: "RM",
  },
  {
    nome: "Carolina Lima",
    cargo: "Head de Operações, Bloom Agency",
    texto:
      "A plataforma é intuitiva e o suporte é excepcional. Em 2 semanas, estávamos operando 100% nela.",
    iniciais: "CL",
  },
];

const FAQ = [
  {
    q: "Preciso de cartão de crédito para testar?",
    a: "Não. Você começa com 7 dias grátis sem informar cartão. Só decide um plano quando quiser assinar.",
  },
  {
    q: "Como funciona a assinatura?",
    a: "O pagamento é mensal via cartão de crédito, PIX ou boleto, processado pelo Mercado Pago. Cancele a qualquer momento.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Sim. Você pode fazer upgrade ou downgrade do plano quando quiser, com reajuste proporcional.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Tudo é armazenado em nuvem com criptografia e políticas de acesso por função (admin, equipe e cliente).",
  },
  {
    q: "Tem suporte se eu precisar de ajuda?",
    a: "Todos os planos incluem suporte por e-mail. Planos Pro e Enterprise contam com suporte prioritário.",
  },
];

// JSON-LD: aplica­ção de software + organização + FAQ para SEO estruturado.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: SITE.description,
  url: SITE.url,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
    description: "Teste grátis por 7 dias",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "128",
  },
};

const orgLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  email: SITE.email,
  logo: `${SITE.url}/logo-full.svg`,
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default async function LandingPage() {
  const supabase = createAdminClient();
  // planos (cacheado) e detecção de user são independentes → paralelo.
  const [planosList, { data: { user } }] = await Promise.all([
    getPlanos(),
    createClient().auth.getUser(),
  ]);

  let panelHref: string | null = null;
  if (user) {
    const { data: superAdm } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (superAdm) {
      panelHref = "/super-admin";
    } else {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("role, cliente_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (usuario) {
        const role = usuario.role as UserRole;
        if (role === "admin_agencia" || role === "membro_equipe") panelHref = "/admin";
        else if (role === "cliente" || usuario.cliente_id) panelHref = "/cliente";
      }
    }
  }

  return (
    <div className="min-h-screen bg-bg text-slate-100 relative overflow-x-hidden">
      {/* SEO estruturado */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* Fundo sutil — um único gradiente radial calmo no topo */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-royal-500/[0.07] rounded-full blur-[100px] pointer-events-none"
      />

      {/* Navbar — sticky com blur */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-bg/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" aria-label="SM Hub — início">
            <Logo variant="full" className="!h-12 sm:!h-14" />
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-300">
            <a href="#funcionalidades" className="hover:text-slate-100 transition-colors">
              Funcionalidades
            </a>
            <a href="#planos" className="hover:text-slate-100 transition-colors">
              Planos
            </a>
            <a href="#faq" className="hover:text-slate-100 transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {panelHref ? (
              <Link href={panelHref}>
                <Button variant="primary" size="sm" iconLeft={<LayoutDashboard className="h-4 w-4" />}>
                  <span className="hidden sm:inline">Ir para o painel</span>
                  <span className="sm:hidden">Painel</span>
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Entrar
                  </Button>
                </Link>
                <Link href="/checkout?plano=pro">
                  <Button size="sm" magnetic iconRight={<ArrowRight className="h-4 w-4" />}>
                    <span className="hidden sm:inline">Começar grátis</span>
                    <span className="sm:hidden">Começar</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-14 sm:pb-20 text-center">
        <Hero3D />
        <HeroStars />
        <div className="relative z-10 pointer-events-none">
        <div className="flex justify-center mb-8">
          <Logo variant="full" className="!h-36 sm:!h-44 logo-hero-animated" />
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
          Menos ferramenta,{" "}
          <span className="bg-gradient-to-r from-royal-300 via-royal-400 to-royal-500 bg-clip-text text-transparent">
            mais resultado
          </span>
        </h1>
        <p className="mt-5 sm:mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
          A SM Hub reúne clientes, planejamento editorial, relatórios, financeiro e
          contratos digitais em um só fluxo. Sua agência ganha tempo para criar
          enquanto a operação roda organizada.
        </p>
        <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 pointer-events-auto">
          <Link href="/checkout?plano=pro" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto glow-hover" iconRight={<ArrowRight className="h-4 w-4" />}>
              Testar 7 dias grátis
            </Button>
          </Link>
          <Link href="#planos" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Ver planos
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Sem cartão de crédito · Pague com PIX, boleto ou cartão
        </p>

        {/* Prova social / stats */}
        <div className="mt-12 sm:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {STATS.map((s, i) => (
            <Reveal
              key={s.label}
              as="div"
              delay={i * 80}
              className="rounded-xl border border-border/60 bg-bg-surface/60 px-4 py-4 sm:py-5 text-left card-hover"
            >
              <s.icon className="h-5 w-5 text-royal-300 mb-2" />
              <p className="text-xl sm:text-2xl font-bold text-slate-100 leading-tight">
                {s.value}
              </p>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{s.label}</p>
            </Reveal>
          ))}
        </div>
        </div>
      </section>

      {/* Features — timeline */}
      <FeaturesTimeline />

      {/* Nosso Ecossistema — loop infinito de logos */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="text-center mb-8">
          <p className="text-xs text-slate-500 font-medium">Integrações</p>
          <h2 className="text-xl sm:text-3xl font-bold mt-2">
            Conectado com as redes que você já usa
          </h2>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm">
            Puxe métricas e monte relatórios sem sair da SM Hub.
          </p>
        </div>
        <EcossistemaMarquee />
      </section>

      {/* Como funciona */}
      <StepsSection />

      {/* Como a SM Hub ajuda — exploração interativa 3D */}
      <InteractiveShowcase />

      {/* Planos */}
      <section id="planos" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 scroll-mt-20">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs text-slate-500 font-medium">Planos</p>
          <h2 className="text-2xl sm:text-4xl font-bold mt-2">
            Escolha o plano ideal
          </h2>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            7 dias grátis em todos. Cancele quando quiser.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 items-stretch">
          {planosList.map((p) => (
            <PlanoCard
              key={p.id}
              id={p.id as Plano}
              nome={p.nome}
              valorMensal={Number(p.valor_mensal)}
              descricao={p.descricao}
              features={PLANO_FEATURES[p.id as Plano]}
              destaque={p.id === "pro"}
            />
          ))}
        </div>
        <p className="text-center text-sm text-slate-500 mt-6">
          Todos os planos incluem suporte e atualizações gratuitas.
        </p>
      </section>

      {/* Depoimentos */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs text-slate-500 font-medium">Depoimentos</p>
          <h2 className="text-2xl sm:text-4xl font-bold mt-2">
            O que dizem quem usa
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          {DEPOIMENTOS.map((d, i) => (
            <Reveal key={d.nome} delay={i * 90}>
              <Card hoverable className="h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-royal-500 to-royal-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {d.iniciais}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{d.nome}</p>
                    <p className="text-xs text-slate-400">{d.cargo}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">&ldquo;{d.texto}&rdquo;</p>
              </Card>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-xs text-slate-600 mt-4">
          Depoimentos ilustrativos para demonstração.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 scroll-mt-20">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs text-slate-500 font-medium">Dúvidas frequentes</p>
          <h2 className="text-2xl sm:text-4xl font-bold mt-2">Perguntas e respostas</h2>
        </div>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 50}>
              <details
                className="group rounded-xl border border-border bg-bg-surface/60 px-4 sm:px-5 py-4 open:bg-bg-surface transition-colors"
              >
                <summary className="flex items-center justify-between gap-4 text-sm sm:text-base font-semibold text-slate-100 cursor-pointer list-none">
                  {f.q}
                  <Plus className="h-5 w-5 shrink-0 text-royal-300 icon-wiggle-hover transition-transform duration-300 group-open:rotate-45" />
                </summary>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <Card className="text-center card-hover">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
            Pronto pra organizar sua agência?
          </h2>
          <p className="text-slate-300 mt-2 max-w-xl mx-auto text-sm sm:text-base">
            Teste a SM Hub por 7 dias. Sem cartão e sem compromisso.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/checkout?plano=pro" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto glow-hover" iconRight={<ArrowRight className="h-4 w-4" />}>
                Começar grátis
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="ghost" className="w-full sm:w-auto">
                Entrar
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border mt-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="col-span-2 lg:col-span-1">
            <Logo variant="full" className="!h-12" />
            <p className="text-sm text-slate-400 mt-3 max-w-xs">
              A plataforma completa para agências de marketing gerenciarem clientes,
              planejamentos, relatórios e financeiro em um só lugar.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
              Produto
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#funcionalidades" className="hover:text-slate-200">Funcionalidades</a></li>
              <li><a href="#planos" className="hover:text-slate-200">Planos</a></li>
              <li><a href="#faq" className="hover:text-slate-200">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
              Conta
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/login" className="hover:text-slate-200">Entrar</Link></li>
              <li><Link href="/checkout?plano=pro" className="hover:text-slate-200">Assinar</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
              Recursos
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Suporte por e-mail</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Atualizações grátis</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-royal-300" /> Dados em nuvem</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} SM Hub. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <Link href="/login" className="hover:text-slate-300">Entrar</Link>
              <Link href="/checkout?plano=pro" className="hover:text-slate-300">Assinar</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}