-- ===========================================================================
-- 0017_cliente_credenciais_relatorio_metricas_templates.sql
-- ===========================================================================
-- Adiciona:
--   - clientes.credenciais (jsonb) — credenciais de acesso do cliente
--   - relatorios: seguindo, comentarios, cliques_link, mensagens, posts_feitos
--   - fatura_arquivos (tabela) — boleto/NF anexados à fatura
--   - 3 templates globais de contrato (Mensal, Trimestral, Anual)
-- ===========================================================================

-- ===========================================================================
-- CLIENTES: credenciais
-- ===========================================================================
alter table public.clientes
  add column if not exists credenciais jsonb default '[]'::jsonb;

comment on column public.clientes.credenciais is
  'Lista de credenciais: [{"label","url","usuario","senha","observacao"}]';

-- ===========================================================================
-- RELATORIOS: métricas expandidas
-- ===========================================================================
alter table public.relatorios
  add column if not exists seguindo integer default 0,
  add column if not exists comentarios bigint default 0,
  add column if not exists cliques_link integer default 0,
  add column if not exists mensagens integer default 0,
  add column if not exists posts_feitos integer default 0;

-- ===========================================================================
-- FATURA ARQUIVOS (boleto, NF, outros)
-- ===========================================================================
create table if not exists public.fatura_arquivos (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid references public.faturas(id) on delete cascade not null,
  agencia_id uuid references public.agencias(id) on delete cascade not null,
  tipo text not null default 'outro' check (tipo in ('boleto','nota_fiscal','outro')),
  nome text not null,
  url text not null,
  mime text,
  tamanho bigint,
  created_at timestamptz default now()
);

create index if not exists idx_fatura_arquivos_fatura on public.fatura_arquivos(fatura_id);
create index if not exists idx_fatura_arquivos_agencia on public.fatura_arquivos(agencia_id);

alter table public.fatura_arquivos enable row level security;

-- Admin/membro da agência pode ver arquivos das faturas da própria agência
create policy "fatura_arquivos_select_own_agencia" on public.fatura_arquivos
  for select using (
    agencia_id in (select agencia_id from public.usuarios where user_id = auth.uid())
  );

create policy "fatura_arquivos_admin_all" on public.fatura_arquivos
  for all using (
    agencia_id in (
      select u.agencia_id from public.usuarios u
      where u.user_id = auth.uid() and u.role in ('admin_agencia','membro_equipe')
    )
  )
  with check (
    agencia_id in (
      select u.agencia_id from public.usuarios u
      where u.user_id = auth.uid() and u.role in ('admin_agencia','membro_equipe')
    )
  );

create policy "fatura_arquivos_super_all" on public.fatura_arquivos
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- ===========================================================================
-- 3 TEMPLATES GLOBAIS DE CONTRATO (Mensal / Trimestral / Anual)
-- Idempotente: só insere se o nome não existir.
-- ===========================================================================
insert into public.contrato_templates (agencia_id, nome, descricao, conteudo, variaveis, is_global)
select
  null,
  'Contrato Mensal de Prestação de Serviços',
  'Contrato mensal de gestão de mídias sociais com cláusulas numeradas (objeto, vigência, pagamento, confidencialidade, rescisão, foro).',
  '<h1 style="text-align:center">CONTRATO MENSAL DE PRESTAÇÃO DE SERVIÇOS</h1>
<p style="text-align:center"><strong>CONTRATO Nº {{contrato.numero}}</strong></p>

<p>Pelo presente instrumento particular, de um lado <strong>{{agencia.nome_fantasia}}</strong>, doravante denominada <strong>CONTRATADA</strong>, e de outro lado <strong>{{cliente.nome_empresa}}</strong>, inscrita no CNPJ/CPF sob nº <strong>{{cliente.cnpj_cpf}}</strong>, doravante denominada <strong>CONTRATANTE</strong>, têm entre si justo e acordado o quanto segue:</p>

<h2>CLÁUSULA 1ª — DO OBJETO</h2>
<p>A CONTRATADA prestará à CONTRATANTE serviços de gestão de mídias sociais, compreendendo planejamento editorial, criação de conteúdo, monitoramento e relatórios mensais, conforme escopo detalhado em proposta comercial anexa.</p>

<h2>CLÁUSULA 2ª — DA VIGÊNCIA</h2>
<p>O presente contrato terá vigência de <strong>{{duracao}} ({{duracao_extenso}})</strong> meses, com início em <strong>{{data_inicio}}</strong> e término em <strong>{{data_fim}}</strong>, podendo ser renovado mediante aditivo escrito entre as partes.</p>

<h2>CLÁUSULA 3ª — DO PAGAMENTO</h2>
<p>Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA a importância mensal de <strong>R$ {{valor}} ({{valor_extenso}})</strong>, com vencimento todo dia <strong>{{dia_vencimento}}</strong> de cada mês, mediante boleto bancário ou Pix.</p>
<p>§1º O atraso no pagamento implicará multa de 2% e juros de mora de 1% ao mês.</p>
<p>§2º Os valores serão reajustados anualmente pelo IGP-M ou índice que vier a substituí-lo.</p>

<h2>CLÁUSULA 4ª — DA CONFIDENCIALIDADE</h2>
<p>As partes obrigam-se a manter sigilo absoluto sobre todas as informações confidenciais a que tiverem acesso em razão deste contrato, incluindo dados estratégicos, listas de clientes, métricas e propriedades intelectuais, sob pena de responder por perdas e danos.</p>

<h2>CLÁUSULA 5ª — DA RESCISÃO</h2>
<p>Qualquer das partes poderá rescindir o presente contrato, sem ônus, mediante aviso prévio de 30 (trinta) dias. O descumprimento de qualquer cláusula sujeitará a parte infratora a indenização por perdas e danos.</p>

<h2>CLÁUSULA 6ª — DO FORO</h2>
<p>As partes elegem o foro da Comarca de <strong>{{agencia.cidade}}</strong> para dirimir quaisquer questões oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

<p style="margin-top:40px;text-align:center">{{agencia.cidade}}, {{data_assinatura}}.</p>

<hr/>
<table style="width:100%;margin-top:30px">
<tr>
<td style="text-align:center;width:50%">___________________________<br/><strong>CONTRATANTE</strong><br/>{{cliente.nome_responsavel}}</td>
<td style="text-align:center;width:50%">___________________________<br/><strong>CONTRATADA</strong><br/>{{agencia.nome_fantasia}}</td>
</tr>
</table>',
  '[
    {"key":"contrato.numero","label":"Número do contrato","type":"string","required":false},
    {"key":"cliente.nome_empresa","label":"Nome da empresa do cliente","type":"string","required":true},
    {"key":"cliente.nome_responsavel","label":"Nome do responsável","type":"string","required":true},
    {"key":"cliente.cnpj_cpf","label":"CNPJ/CPF do cliente","type":"string","required":false},
    {"key":"cliente.endereco","label":"Endereço do cliente","type":"string","required":false},
    {"key":"agencia.nome_fantasia","label":"Nome fantasia da agência","type":"string","required":true},
    {"key":"agencia.cnpj","label":"CNPJ da agência","type":"string","required":false},
    {"key":"agencia.endereco","label":"Endereço da agência","type":"string","required":false},
    {"key":"agencia.cidade","label":"Cidade da agência (foro)","type":"string","required":true},
    {"key":"duracao","label":"Duração (meses)","type":"number","required":true},
    {"key":"duracao_extenso","label":"Duração por extenso","type":"string","required":true},
    {"key":"data_inicio","label":"Data de início","type":"date","required":true},
    {"key":"data_fim","label":"Data de término","type":"date","required":true},
    {"key":"valor","label":"Valor mensal","type":"currency","required":true},
    {"key":"valor_extenso","label":"Valor por extenso","type":"string","required":true},
    {"key":"dia_vencimento","label":"Dia de vencimento","type":"number","required":true},
    {"key":"data_assinatura","label":"Data de assinatura","type":"date","required":true}
  ]'::jsonb,
  true
where not exists (
  select 1 from public.contrato_templates where nome = 'Contrato Mensal de Prestação de Serviços' and is_global = true
);

insert into public.contrato_templates (agencia_id, nome, descricao, conteudo, variaveis, is_global)
select
  null,
  'Contrato Trimestral de Prestação de Serviços',
  'Contrato trimestral (3 meses) de gestão de mídias sociais com cláusulas numeradas.',
  '<h1 style="text-align:center">CONTRATO TRIMESTRAL DE PRESTAÇÃO DE SERVIÇOS</h1>
<p style="text-align:center"><strong>CONTRATO Nº {{contrato.numero}}</strong></p>

<p>Pelo presente instrumento particular, de um lado <strong>{{agencia.nome_fantasia}}</strong>, doravante denominada <strong>CONTRATADA</strong>, e de outro lado <strong>{{cliente.nome_empresa}}</strong>, inscrita no CNPJ/CPF sob nº <strong>{{cliente.cnpj_cpf}}</strong>, doravante denominada <strong>CONTRATANTE</strong>, têm entre si justo e acordado o quanto segue:</p>

<h2>CLÁUSULA 1ª — DO OBJETO</h2>
<p>A CONTRATADA prestará à CONTRATANTE serviços de gestão de mídias sociais em regime trimestral, compreendendo planejamento editorial estratégico, criação de conteúdo, gerenciamento de campanhas de mídia paga e relatórios mensais detalhados.</p>

<h2>CLÁUSULA 2ª — DA VIGÊNCIA</h2>
<p>O presente contrato terá vigência de <strong>{{duracao}} ({{duracao_extenso}})</strong> meses (período trimestral), com início em <strong>{{data_inicio}}</strong> e término em <strong>{{data_fim}}</strong>, renovável mediante termo aditivo.</p>

<h2>CLÁUSULA 3ª — DO PAGAMENTO</h2>
<p>Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA a importância mensal de <strong>R$ {{valor}} ({{valor_extenso}})</strong>, com vencimento todo dia <strong>{{dia_vencimento}}</strong>. O pagamento trimestral poderá ser antecipado, com 5% de desconto, a critério da CONTRATANTE.</p>
<p>§1º O atraso no pagamento implicará multa de 2% e juros de mora de 1% ao mês.</p>
<p>§2º Os valores serão reajustados anualmente pelo IGP-M.</p>

<h2>CLÁUSULA 4ª — DA CONFIDENCIALIDADE</h2>
<p>As partes obrigam-se a manter sigilo absoluto sobre informações confidenciais, dados estratégicos e propriedades intelectuais, responsabilizando-se por perdas e danos em caso de violação.</p>

<h2>CLÁUSULA 5ª — DA RESCISÃO</h2>
<p>Qualquer das partes poderá rescindir o presente contrato mediante aviso prévio de 30 (trinta) dias, sem ônus, desde que cumpridos os compromissos já assumidos. O descumprimento de cláusulas sujeitará a parte infratora a perdas e danos.</p>

<h2>CLÁUSULA 6ª — DO FORO</h2>
<p>As partes elegem o foro da Comarca de <strong>{{agencia.cidade}}</strong> para dirimir quaisquer questões oriundas do presente contrato, com renúncia a qualquer outro.</p>

<p style="margin-top:40px;text-align:center">{{agencia.cidade}}, {{data_assinatura}}.</p>

<hr/>
<table style="width:100%;margin-top:30px">
<tr>
<td style="text-align:center;width:50%">___________________________<br/><strong>CONTRATANTE</strong><br/>{{cliente.nome_responsavel}}</td>
<td style="text-align:center;width:50%">___________________________<br/><strong>CONTRATADA</strong><br/>{{agencia.nome_fantasia}}</td>
</tr>
</table>',
  '[
    {"key":"contrato.numero","label":"Número do contrato","type":"string","required":false},
    {"key":"cliente.nome_empresa","label":"Nome da empresa do cliente","type":"string","required":true},
    {"key":"cliente.nome_responsavel","label":"Nome do responsável","type":"string","required":true},
    {"key":"cliente.cnpj_cpf","label":"CNPJ/CPF do cliente","type":"string","required":false},
    {"key":"cliente.endereco","label":"Endereço do cliente","type":"string","required":false},
    {"key":"agencia.nome_fantasia","label":"Nome fantasia da agência","type":"string","required":true},
    {"key":"agencia.cnpj","label":"CNPJ da agência","type":"string","required":false},
    {"key":"agencia.endereco","label":"Endereço da agência","type":"string","required":false},
    {"key":"agencia.cidade","label":"Cidade da agência (foro)","type":"string","required":true},
    {"key":"duracao","label":"Duração (meses)","type":"number","required":true},
    {"key":"duracao_extenso","label":"Duração por extenso","type":"string","required":true},
    {"key":"data_inicio","label":"Data de início","type":"date","required":true},
    {"key":"data_fim","label":"Data de término","type":"date","required":true},
    {"key":"valor","label":"Valor mensal","type":"currency","required":true},
    {"key":"valor_extenso","label":"Valor por extenso","type":"string","required":true},
    {"key":"dia_vencimento","label":"Dia de vencimento","type":"number","required":true},
    {"key":"data_assinatura","label":"Data de assinatura","type":"date","required":true}
  ]'::jsonb,
  true
where not exists (
  select 1 from public.contrato_templates where nome = 'Contrato Trimestral de Prestação de Serviços' and is_global = true
);

insert into public.contrato_templates (agencia_id, nome, descricao, conteudo, variaveis, is_global)
select
  null,
  'Contrato Anual de Prestação de Serviços',
  'Contrato anual (12 meses) de gestão de mídias sociais com cláusulas numeradas e condições especiais para vínculo de longo prazo.',
  '<h1 style="text-align:center">CONTRATO ANUAL DE PRESTAÇÃO DE SERVIÇOS</h1>
<p style="text-align:center"><strong>CONTRATO Nº {{contrato.numero}}</strong></p>

<p>Pelo presente instrumento particular, de um lado <strong>{{agencia.nome_fantasia}}</strong>, doravante denominada <strong>CONTRATADA</strong>, e de outro lado <strong>{{cliente.nome_empresa}}</strong>, inscrita no CNPJ/CPF sob nº <strong>{{cliente.cnpj_cpf}}</strong>, doravante denominada <strong>CONTRATANTE</strong>, têm entre si justo e acordado o quanto segue:</p>

<h2>CLÁUSULA 1ª — DO OBJETO</h2>
<p>A CONTRATADA prestará à CONTRATANTE serviços completos de gestão de mídias sociais, compreendendo planejamento estratégico, criação de conteúdo, monitoramento, gestão de campanhas de mídia paga, relatórios mensais e reuniões trimestrais de alinhamento, conforme escopo detalhado em proposta comercial anexa.</p>

<h2>CLÁUSULA 2ª — DA VIGÊNCIA</h2>
<p>O presente contrato terá vigência de <strong>{{duracao}} ({{duracao_extenso}})</strong> meses (período anual), com início em <strong>{{data_inicio}}</strong> e término em <strong>{{data_fim}}</strong>, renovável automaticamente por igual período caso não haja manifestação em contrário com 60 dias de antecedência.</p>

<h2>CLÁUSULA 3ª — DO PAGAMENTO</h2>
<p>Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA a importância mensal de <strong>R$ {{valor}} ({{valor_extenso}})</strong>, com vencimento todo dia <strong>{{dia_vencimento}}</strong>. O pagamento anual antecipado terá desconto de 10%, a ser pago em até 5 dias úteis após a assinatura deste contrato.</p>
<p>§1º O atraso no pagamento implicará multa de 2% e juros de mora de 1% ao mês.</p>
<p>§2º Os valores serão reajustados anualmente pelo IGP-M ou índice substituto.</p>
<p>§3º A interrupção do pagamento por mais de 60 dias autoriza a CONTRATADA a suspender imediatamente os serviços, sem prejuízo da cobrança dos valores devidos.</p>

<h2>CLÁUSULA 4ª — DA CONFIDENCIALIDADE E PROPRIEDADE INTELECTUAL</h2>
<p>As partes obrigam-se a manter sigilo absoluto sobre todas as informações confidenciais, dados estratégicos, listas de clientes, métricas e propriedades intelectuais. O conteúdo criado pela CONTRATADA durante a vigência deste contrato poderá ser utilizado pela CONTRATANTE em seus canais oficiais.</p>

<h2>CLÁUSULA 5ª — DA RESCISÃO</h2>
<p>§1º A rescisão antecipada por iniciativa da CONTRATANTE, antes do término da vigência, implicará pagamento de multa compensatória equivalente a 30% do valor das parcelas restantes.</p>
<p>§2º Qualquer das partes poderá rescindir o presente contrato em caso de descumprimento de cláusulas, mediante notificação prévia de 15 dias.</p>

<h2>CLÁUSULA 6ª — DO FORO</h2>
<p>As partes elegem o foro da Comarca de <strong>{{agencia.cidade}}</strong> para dirimir quaisquer questões oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

<p style="margin-top:40px;text-align:center">{{agencia.cidade}}, {{data_assinatura}}.</p>

<hr/>
<table style="width:100%;margin-top:30px">
<tr>
<td style="text-align:center;width:50%">___________________________<br/><strong>CONTRATANTE</strong><br/>{{cliente.nome_responsavel}}</td>
<td style="text-align:center;width:50%">___________________________<br/><strong>CONTRATADA</strong><br/>{{agencia.nome_fantasia}}</td>
</tr>
</table>',
  '[
    {"key":"contrato.numero","label":"Número do contrato","type":"string","required":false},
    {"key":"cliente.nome_empresa","label":"Nome da empresa do cliente","type":"string","required":true},
    {"key":"cliente.nome_responsavel","label":"Nome do responsável","type":"string","required":true},
    {"key":"cliente.cnpj_cpf","label":"CNPJ/CPF do cliente","type":"string","required":false},
    {"key":"cliente.endereco","label":"Endereço do cliente","type":"string","required":false},
    {"key":"agencia.nome_fantasia","label":"Nome fantasia da agência","type":"string","required":true},
    {"key":"agencia.cnpj","label":"CNPJ da agência","type":"string","required":false},
    {"key":"agencia.endereco","label":"Endereço da agência","type":"string","required":false},
    {"key":"agencia.cidade","label":"Cidade da agência (foro)","type":"string","required":true},
    {"key":"duracao","label":"Duração (meses)","type":"number","required":true},
    {"key":"duracao_extenso","label":"Duração por extenso","type":"string","required":true},
    {"key":"data_inicio","label":"Data de início","type":"date","required":true},
    {"key":"data_fim","label":"Data de término","type":"date","required":true},
    {"key":"valor","label":"Valor mensal","type":"currency","required":true},
    {"key":"valor_extenso","label":"Valor por extenso","type":"string","required":true},
    {"key":"dia_vencimento","label":"Dia de vencimento","type":"number","required":true},
    {"key":"data_assinatura","label":"Data de assinatura","type":"date","required":true}
  ]'::jsonb,
  true
where not exists (
  select 1 from public.contrato_templates where nome = 'Contrato Anual de Prestação de Serviços' and is_global = true
);
