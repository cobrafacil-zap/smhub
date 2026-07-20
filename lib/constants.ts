// Meses em PT-BR para uso geral (calendários, formulários).
export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const MONTHS_PT_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export const WEEKDAYS_PT = [
  "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb",
];

export const WEEKDAYS_PT_LONG = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado",
];

/** Roles de usuário no SM Hub. */
export const USER_ROLES = {
  super_admin: "Super Admin",
  admin_agencia: "Admin da Agência",
  membro_equipe: "Membro da Equipe",
  cliente: "Cliente",
} as const;

export const PLATAFORMAS_REDES = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube",
  "twitter",
] as const;

export const PLATAFORMA_LABELS: Record<(typeof PLATAFORMAS_REDES)[number], string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  twitter: "X (Twitter)",
};

/** Tipos de entrada do calendário editorial. */
export const ENTRY_TIPOS = [
  { value: "post_feed", label: "Post Feed" },
  { value: "story", label: "Story" },
  { value: "reels", label: "Reels" },
  { value: "carrossel", label: "Carrossel" },
  { value: "video", label: "Vídeo" },
  { value: "artigo", label: "Artigo" },
] as const;

export const ENTRY_TIPO_LABEL: Record<string, string> = Object.fromEntries(
  ENTRY_TIPOS.map((t) => [t.value, t.label])
);

/**
 * Cor FIXA por tipo de post — não é escolhida pelo usuário. Cada tipo tem
 * sempre a mesma cor no calendário/lista (padrão visual).
 *   post_feed  = verde   (success)
 *   story      = azul    (royal)
 *   reels      = vermelho (danger)
 *   carrossel  = âmbar   (amber)
 *   video      = rosa    (pink)
 *   artigo     = cinza   (slate)
 * `chip` = classes p/ o bloco do calendário; `dot` = classe de cor sólida p/ bolinhas.
 */
export const ENTRY_TIPO_COR: Record<
  string,
  { chip: string; dot: string }
> = {
  // Chip: texto legível nos dois temas — base (claro) mais escuro, dark: mais claro.
  post_feed: { chip: "bg-success-500/20 text-success-600 dark:text-success-400 border-success-500/30", dot: "bg-success-500" },
  story: { chip: "bg-royal-500/20 text-royal-700 dark:text-royal-200 border-royal-500/30", dot: "bg-royal-500" },
  reels: { chip: "bg-danger-500/20 text-danger-600 dark:text-danger-400 border-danger-500/30", dot: "bg-danger-500" },
  carrossel: { chip: "bg-amber-500/20 text-amber-700 dark:text-amber-200 border-amber-500/30", dot: "bg-amber-500" },
  video: { chip: "bg-pink-500/20 text-pink-700 dark:text-pink-200 border-pink-500/30", dot: "bg-pink-500" },
  artigo: { chip: "bg-slate-500/20 text-slate-700 dark:text-slate-200 border-slate-500/30", dot: "bg-slate-500" },
};

export const ENTRY_STATUS = {
  pendente: { label: "Pendente", color: "warning" as const },
  aprovado: { label: "Aprovado", color: "info" as const },
  publicado: { label: "Publicado", color: "success" as const },
  rejeitado: { label: "Rejeitado", color: "danger" as const },
  alteracao_solicitada: { label: "Mudança solicitada", color: "warning" as const },
} as const;

/** Segmentos de mercado predefinidos para clientes. */
export const CLIENTE_SEGMENTOS = [
  "Alimentação",
  "Beleza e Estética",
  "Educação",
  "Imobiliário",
  "Jurídico",
  "Marketing/Comunicação",
  "Moda",
  "Saúde",
  "Tecnologia",
  "Varejo",
  "Outro",
] as const;

export type ClienteSegmento = (typeof CLIENTE_SEGMENTOS)[number];

/** Status de cliente. */
export const CLIENTE_STATUS = {
  ativo: { label: "Ativo", color: "success" as const },
  inativo: { label: "Inativo", color: "default" as const },
  pausado: { label: "Pausado", color: "warning" as const },
} as const;

/** Status de agência. */
export const AGENCIA_STATUS = {
  ativa: { label: "Ativa", color: "success" as const },
  suspensa: { label: "Suspensa", color: "warning" as const },
  cancelada: { label: "Cancelada", color: "danger" as const },
} as const;

export const AGENCIA_PLANOS = {
  basico: "Básico",
  pro: "Pro",
  enterprise: "Enterprise",
} as const;

/** Status de contrato. */
export const CONTRATO_STATUS = {
  rascunho: { label: "Rascunho", color: "default" as const },
  enviado: { label: "Enviado", color: "info" as const },
  assinado: { label: "Assinado", color: "success" as const },
  ativo: { label: "Ativo", color: "success" as const },
  encerrado: { label: "Encerrado", color: "default" as const },
  cancelado: { label: "Cancelado", color: "danger" as const },
} as const;

/** Status de fatura. */
export const FATURA_STATUS = {
  pendente: { label: "Pendente", color: "warning" as const },
  pago: { label: "Pago", color: "success" as const },
  atrasado: { label: "Atrasado", color: "danger" as const },
} as const;

/** Status de transação. */
export const TRANSACAO_STATUS = {
  pendente: { label: "Pendente", color: "warning" as const },
  pago: { label: "Pago", color: "success" as const },
  atrasado: { label: "Atrasado", color: "danger" as const },
  cancelado: { label: "Cancelado", color: "default" as const },
} as const;

/** Categorias padrão de receitas. */
export const CATEGORIAS_RECEITA = [
  "mensalidade",
  "bonus",
  "servico_extra",
  "outro",
] as const;

/** Categorias padrão de despesas. */
export const CATEGORIAS_DESPESA = [
  "salario",
  "ferramentas",
  "ads",
  "impostos",
  "aluguel",
  "outro",
] as const;

/** Categorias por tipo (helper). */
export const CATEGORIAS = {
  receita: CATEGORIAS_RECEITA,
  despesa: CATEGORIAS_DESPESA,
} as const;

/** Tipos MIME permitidos para upload de planilhas/contratos/etc. */
export const ALLOWED_PLAN_EXTENSIONS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const PLAN_BUCKET = "content-plans";

/** Buckets de storage. */
export const STORAGE_BUCKETS = {
  agency: "agency-assets",
  client: "client-assets",
  contracts: "contracts",
  briefings: "briefings",
  reports: "reports",
  invoices: "invoices",
  platform: "platform-assets",
} as const;
