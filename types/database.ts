/**
 * Tipos do banco SM Hub.
 * Esta é uma versão manual baseada nas migrations 0001_init.sql.
 * Para sincronizar com o Supabase real, rode:
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Plano = "basico" | "pro" | "enterprise";

export interface PlanoConfig {
  id: Plano;
  nome: string;
  valor_mensal: number;
  descricao: string | null;
  ativo: boolean;
  updated_at: string;
}

/** Configuração global da plataforma (singleton id='singleton'). */
export interface PlatformConfig {
  id: string;
  logo_url_light: string | null;
  logo_url_dark: string | null;
  updated_at: string;
}
export type AgenciaStatus = "ativa" | "suspensa" | "cancelada";
export type UserRole = "super_admin" | "admin_agencia" | "membro_equipe" | "cliente";
export type ClienteStatus = "ativo" | "inativo" | "pausado";
export type TarefaStatus = "destinada" | "em_andamento" | "pronta" | "entregue";
export type TarefaPrioridade = "baixa" | "media" | "alta" | "urgente";
export type GravacaoStatus = "agendada" | "confirmada" | "concluida" | "cancelada";
export type PlanejamentoStatus = "rascunho" | "aprovado" | "em_execucao" | "concluido";
export type EntradaTipo = "post_feed" | "story" | "reels" | "carrossel" | "video" | "artigo";
export type EntradaStatus =
  | "pendente"
  | "aprovado"
  | "publicado"
  | "rejeitado"
  | "alteracao_solicitada";
export type Plataforma =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "twitter";
export type TransacaoTipo = "receita" | "despesa";
export type TransacaoStatus = "pendente" | "pago" | "atrasado" | "cancelado";
export type TransacaoNatureza = "fixa" | "variavel";
export type FaturaStatus = "pendente" | "pago" | "atrasado";
export type ContratoStatus =
  | "rascunho"
  | "enviado"
  | "assinado"
  | "ativo"
  | "encerrado"
  | "cancelado";

export interface VariavelContrato {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "currency";
  required?: boolean;
}

export interface AssinaturaRegistro {
  papel: "cliente" | "agencia";
  data: string;
  ip?: string;
  user_agent?: string;
  hash: string;
  signature_data_url?: string;
}

export interface RespostaBriefing {
  pergunta: string;
  resposta: string;
}

export interface Database {
  public: {
    Tables: {
      super_admins: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          email: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nome: string;
          email: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["super_admins"]["Insert"]>;
      };
      agencias: {
        Row: {
          id: string;
          nome_fantasia: string;
          razao_social: string | null;
          cnpj: string | null;
          logo_url: string | null;
          cor_primaria: string;
          endereco: string | null;
          telefone: string | null;
          email_contato: string | null;
          status: AgenciaStatus;
          plano: Plano;
          trial_ate: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome_fantasia: string;
          razao_social?: string | null;
          cnpj?: string | null;
          logo_url?: string | null;
          cor_primaria?: string;
          endereco?: string | null;
          telefone?: string | null;
          email_contato?: string | null;
          status?: AgenciaStatus;
          plano?: Plano;
          trial_ate?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agencias"]["Insert"]>;
      };
      usuarios: {
        Row: {
          id: string;
          user_id: string;
          agencia_id: string | null;
          nome: string;
          email: string;
          telefone: string | null;
          avatar_url: string | null;
          role: UserRole;
          cargo: string | null;
          custo_mensal: number | null;
          ativo: boolean;
          supervisor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agencia_id?: string | null;
          nome: string;
          email: string;
          telefone?: string | null;
          avatar_url?: string | null;
          role: UserRole;
          cargo?: string | null;
          custo_mensal?: number | null;
          ativo?: boolean;
          supervisor_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>;
      };
      clientes: {
        Row: {
          id: string;
          agencia_id: string;
          user_id: string | null;
          nome_empresa: string;
          nome_responsavel: string;
          email: string | null;
          telefone: string | null;
          cnpj_cpf: string | null;
          endereco: string | null;
          segmento: string | null;
          logo_url: string | null;
          status: ClienteStatus;
          valor_mensal: number | null;
          dia_vencimento: number | null;
          observacoes: string | null;
          credenciais: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agencia_id: string;
          user_id?: string | null;
          nome_empresa: string;
          nome_responsavel: string;
          email?: string | null;
          telefone?: string | null;
          cnpj_cpf?: string | null;
          endereco?: string | null;
          segmento?: string | null;
          logo_url?: string | null;
          status?: ClienteStatus;
          valor_mensal?: number | null;
          dia_vencimento?: number | null;
          observacoes?: string | null;
          credenciais?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>;
      };
      planejamentos: {
        Row: {
          id: string;
          cliente_id: string;
          agencia_id: string;
          mes_referencia: string;
          status: PlanejamentoStatus;
          objetivo_geral: string | null;
          observacoes: string | null;
          /** Dias da semana marcados como dias de postagem (0=Dom..6=Sáb). NULL = nenhum. */
          dias_postagem: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          agencia_id: string;
          mes_referencia: string;
          status?: PlanejamentoStatus;
          objetivo_geral?: string | null;
          observacoes?: string | null;
          dias_postagem?: number[] | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["planejamentos"]["Insert"]>;
      };
      planejamento_entradas: {
        Row: {
          id: string;
          planejamento_id: string;
          data: string;
          tipo: EntradaTipo;
          titulo: string;
          descricao: string | null;
          copy: string | null;
          hashtags: string[] | null;
          midia_url: string[] | null;
          status: EntradaStatus;
          publicado_em: string | null;
          aprovacao_comentario: string | null;
          aprovado_por: string | null;
          aprovado_em: string | null;
          cor: string | null;
          estilo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          planejamento_id: string;
          data: string;
          tipo: EntradaTipo;
          titulo: string;
          descricao?: string | null;
          copy?: string | null;
          hashtags?: string[] | null;
          midia_url?: string[] | null;
          status?: EntradaStatus;
          publicado_em?: string | null;
          aprovacao_comentario?: string | null;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          cor?: string | null;
          estilo?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["planejamento_entradas"]["Insert"]>;
      };
      tarefas: {
        Row: {
          id: string;
          agencia_id: string;
          cliente_id: string | null;
          criado_por: string | null;
          titulo: string;
          descricao: string | null;
          status: TarefaStatus;
          prioridade: TarefaPrioridade;
          prazo: string | null;
          ordem: number;
          arquivado: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agencia_id: string;
          cliente_id?: string | null;
          criado_por?: string | null;
          titulo: string;
          descricao?: string | null;
          status?: TarefaStatus;
          prioridade?: TarefaPrioridade;
          prazo?: string | null;
          ordem?: number;
          arquivado?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tarefas"]["Insert"]>;
      };
      tarefa_responsaveis: {
        Row: {
          tarefa_id: string;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          tarefa_id: string;
          usuario_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tarefa_responsaveis"]["Insert"]>;
      };
      gravacoes: {
        Row: {
          id: string;
          agencia_id: string;
          cliente_id: string;
          data: string;
          hora: string | null;
          titulo: string;
          descricao: string | null;
          local: string | null;
          status: GravacaoStatus;
          criado_por: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agencia_id: string;
          cliente_id: string;
          data: string;
          hora?: string | null;
          titulo: string;
          descricao?: string | null;
          local?: string | null;
          status?: GravacaoStatus;
          criado_por?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gravacoes"]["Insert"]>;
      };
      datas_comemorativas: {
        Row: {
          id: string;
          data: string;
          nome: string;
          segmento: string[] | null;
          agencia_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          data: string;
          nome: string;
          segmento?: string[] | null;
          agencia_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["datas_comemorativas"]["Insert"]>;
      };
      relatorios: {
        Row: {
          id: string;
          cliente_id: string;
          agencia_id: string;
          mes_referencia: string;
          plataforma: Plataforma;
          seguidores_inicio: number;
          seguidores_fim: number;
          seguindo: number;
          alcance_total: number;
          impressoes: number;
          total_posts: number;
          total_reels: number;
          total_stories: number;
          total_curtidas: number;
          comentarios: number;
          cliques_link: number;
          mensagens: number;
          posts_feitos: number;
          leads_validados: number;
          investimento_ads: number;
          receita_gerada: number;
          observacoes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          agencia_id: string;
          mes_referencia: string;
          plataforma: Plataforma;
          seguidores_inicio?: number;
          seguidores_fim?: number;
          seguindo?: number;
          alcance_total?: number;
          impressoes?: number;
          total_posts?: number;
          total_reels?: number;
          total_stories?: number;
          total_curtidas?: number;
          comentarios?: number;
          cliques_link?: number;
          mensagens?: number;
          posts_feitos?: number;
          leads_validados?: number;
          investimento_ads?: number;
          receita_gerada?: number;
          observacoes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["relatorios"]["Insert"]>;
      };
      relatorio_metricas_diarias: {
        Row: {
          id: string;
          relatorio_id: string;
          data: string;
          alcance: number;
          impressoes: number;
          curtidas: number;
          comentarios: number;
          compartilhamentos: number;
          novos_seguidores: number;
          leads_estimados: number;
          leads_validados: number;
        };
        Insert: {
          id?: string;
          relatorio_id: string;
          data: string;
          alcance?: number;
          impressoes?: number;
          curtidas?: number;
          comentarios?: number;
          compartilhamentos?: number;
          novos_seguidores?: number;
          leads_estimados?: number;
          leads_validados?: number;
        };
        Update: Partial<Database["public"]["Tables"]["relatorio_metricas_diarias"]["Insert"]>;
      };
      transacoes: {
        Row: {
          id: string;
          agencia_id: string;
          cliente_id: string | null;
          tipo: TransacaoTipo;
          categoria: string;
          descricao: string;
          valor: number;
          data_vencimento: string;
          data_pagamento: string | null;
          status: TransacaoStatus;
          comprovante_url: string | null;
          recorrente: boolean;
          natureza: TransacaoNatureza | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agencia_id: string;
          cliente_id?: string | null;
          tipo: TransacaoTipo;
          categoria: string;
          descricao: string;
          valor: number;
          data_vencimento: string;
          data_pagamento?: string | null;
          status?: TransacaoStatus;
          comprovante_url?: string | null;
          recorrente?: boolean;
          natureza?: TransacaoNatureza | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transacoes"]["Insert"]>;
      };
      faturas: {
        Row: {
          id: string;
          cliente_id: string;
          agencia_id: string;
          competencia: string;
          valor: number;
          data_vencimento: string;
          status: FaturaStatus;
          numero: string | null;
          itens: Json | null;
          pdf_url: string | null;
          data_pagamento: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          agencia_id: string;
          competencia: string;
          valor: number;
          data_vencimento: string;
          status?: FaturaStatus;
          numero?: string | null;
          itens?: Json | null;
          pdf_url?: string | null;
          data_pagamento?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["faturas"]["Insert"]>;
      };
      contrato_templates: {
        Row: {
          id: string;
          agencia_id: string | null;
          nome: string;
          descricao: string | null;
          conteudo: string;
          variaveis: Json | null;
          is_global: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          agencia_id?: string | null;
          nome: string;
          descricao?: string | null;
          conteudo: string;
          variaveis?: Json | null;
          is_global?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contrato_templates"]["Insert"]>;
      };
      contratos: {
        Row: {
          id: string;
          agencia_id: string;
          cliente_id: string;
          template_id: string | null;
          titulo: string;
          conteudo: string;
          valor_mensal: number | null;
          duracao_meses: number | null;
          data_inicio: string | null;
          data_fim: string | null;
          status: ContratoStatus;
          pdf_url: string | null;
          assinaturas: Json | null;
          variaveis: Json | null;
          token_assinatura: string | null;
          token_expira_em: string | null;
          link_gerado_em: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agencia_id: string;
          cliente_id: string;
          template_id?: string | null;
          titulo: string;
          conteudo: string;
          valor_mensal?: number | null;
          duracao_meses?: number | null;
          data_inicio?: string | null;
          data_fim?: string | null;
          status?: ContratoStatus;
          pdf_url?: string | null;
          assinaturas?: Json | null;
          variaveis?: Json | null;
          token_assinatura?: string | null;
          token_expira_em?: string | null;
          link_gerado_em?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contratos"]["Insert"]>;
      };
      planos: {
        Row: {
          id: Plano;
          nome: string;
          valor_mensal: number;
          descricao: string | null;
          ativo: boolean;
          updated_at: string;
        };
        Insert: {
          id: Plano;
          nome: string;
          valor_mensal?: number;
          descricao?: string | null;
          ativo?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["planos"]["Insert"]>;
      };
      briefings: {
        Row: {
          id: string;
          cliente_id: string;
          agencia_id: string;
          respostas: Json;
          preenchido_por: string | null;
          interno: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          agencia_id: string;
          respostas: Json;
          preenchido_por?: string | null;
          interno?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["briefings"]["Insert"]>;
      };
      assinatura_ativa: {
        Row: {
          id: string;
          agencia_id: string;
          plano: Plano;
          status: "pendente" | "paga" | "vencida" | "cancelada" | "trial";
          periodo_inicio: string;
          periodo_fim: string;
          valor_pago: number | null;
          mp_payment_id: string | null;
          mp_preference_id: string | null;
          mp_status_detail: string | null;
          grace_period_dias: number;
          is_trial: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agencia_id: string;
          plano: Plano;
          status?: "pendente" | "paga" | "vencida" | "cancelada" | "trial";
          periodo_inicio?: string;
          periodo_fim: string;
          valor_pago?: number | null;
          mp_payment_id?: string | null;
          mp_preference_id?: string | null;
          mp_status_detail?: string | null;
          grace_period_dias?: number;
          is_trial?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assinatura_ativa"]["Insert"]>;
      };
      assinatura_pagamentos: {
        Row: {
          id: string;
          agencia_id: string;
          assinatura_id: string | null;
          mp_payment_id: string | null;
          mp_status: string | null;
          mp_status_detail: string | null;
          valor: number;
          metodo: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agencia_id: string;
          assinatura_id?: string | null;
          mp_payment_id?: string | null;
          mp_status?: string | null;
          mp_status_detail?: string | null;
          valor: number;
          metodo?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assinatura_pagamentos"]["Insert"]>;
      };
      signup_tokens: {
        Row: {
          id: string;
          token: string;
          email: string;
          nome: string;
          nome_agencia: string;
          plano: Plano;
          user_id: string | null;
          agencia_id: string | null;
          usado_em: string | null;
          expira_em: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          email: string;
          nome: string;
          nome_agencia: string;
          plano: Plano;
          user_id?: string | null;
          agencia_id?: string | null;
          usado_em?: string | null;
          expira_em?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["signup_tokens"]["Insert"]>;
      };
      fatura_arquivos: {
        Row: {
          id: string;
          fatura_id: string;
          agencia_id: string;
          tipo: "boleto" | "nota_fiscal" | "outro";
          nome: string;
          url: string;
          mime: string | null;
          tamanho: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fatura_id: string;
          agencia_id: string;
          tipo?: "boleto" | "nota_fiscal" | "outro";
          nome: string;
          url: string;
          mime?: string | null;
          tamanho?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fatura_arquivos"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Tipos auxiliares para uso comum no app
export type Agencia = Database["public"]["Tables"]["agencias"]["Row"];
export type Usuario = Database["public"]["Tables"]["usuarios"]["Row"];
export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type Planejamento = Database["public"]["Tables"]["planejamentos"]["Row"];
export type Tarefa = Database["public"]["Tables"]["tarefas"]["Row"];
export type TarefaResponsavel =
  Database["public"]["Tables"]["tarefa_responsaveis"]["Row"];
export type Gravacao = Database["public"]["Tables"]["gravacoes"]["Row"];
export type PlanejamentoEntrada =
  Database["public"]["Tables"]["planejamento_entradas"]["Row"];
export type DataComemorativa =
  Database["public"]["Tables"]["datas_comemorativas"]["Row"];
export type Relatorio = Database["public"]["Tables"]["relatorios"]["Row"];
export type RelatorioMetricaDiaria =
  Database["public"]["Tables"]["relatorio_metricas_diarias"]["Row"];
export type Transacao = Database["public"]["Tables"]["transacoes"]["Row"];
export type Fatura = Database["public"]["Tables"]["faturas"]["Row"];
export type ContratoTemplate =
  Database["public"]["Tables"]["contrato_templates"]["Row"];
export type Contrato = Database["public"]["Tables"]["contratos"]["Row"];
export type Briefing = Database["public"]["Tables"]["briefings"]["Row"];
export type SuperAdmin = Database["public"]["Tables"]["super_admins"]["Row"];
export type FaturaArquivo = Database["public"]["Tables"]["fatura_arquivos"]["Row"];
export type AssinaturaAtiva = Database["public"]["Tables"]["assinatura_ativa"]["Row"];
export type AssinaturaPagamento =
  Database["public"]["Tables"]["assinatura_pagamentos"]["Row"];
export type AssinaturaStatus = "pendente" | "paga" | "vencida" | "cancelada" | "trial";

/** Tipo do "perfil" que o middleware/session retorna. */
export interface SessionProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  role: UserRole;
  agencia_id: string | null;
  cliente_id: string | null;
  ativo: boolean;
}

/* -------------------------------------------------------------------------- */
/* Meta Graph API — Instagram + Facebook (tabela cliente_oauth_contas)        */
/* Tipos hand-written (a tabela ainda não está nos tipos gerados pelo Supabase). */
/* -------------------------------------------------------------------------- */

export type MetaProvider = "instagram" | "facebook";

export interface ClienteOauthConta {
  id: string;
  cliente_id: string;
  agencia_id: string;
  provider: MetaProvider;
  external_id: string;
  // Campos de token — NUNCA expostos ao browser.
  access_token_ciphertext: string;
  access_token_iv: string;
  access_token_tag: string;
  token_expires_at: string | null;
  scopes: string | null;
  account_handle: string | null;
  account_name: string | null;
  connected_by: string | null;
  connected_at: string;
  updated_at: string;
}

/** Shape seguro p/ enviar ao browser (sem campos de token). */
export type ConexaoRede = Pick<
  ClienteOauthConta,
  "provider" | "account_handle" | "account_name" | "connected_at"
>;

/** Métricas parciais puxadas da Meta p/ pré-preencher o relatório. */
export type MetricasImportadas = {
  seguidores_inicio?: number;
  seguidores_fim?: number;
  seguindo?: number;
  alcance_total?: number;
  impressoes?: number;
  total_posts?: number;
  total_reels?: number;
  total_stories?: number;
  total_curtidas?: number;
  comentarios?: number;
  cliques_link?: number;
  mensagens?: number;
  posts_feitos?: number;
};
