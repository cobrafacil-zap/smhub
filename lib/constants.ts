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
} as const;
