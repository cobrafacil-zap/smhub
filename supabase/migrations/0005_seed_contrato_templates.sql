-- ===========================================================================
-- 0005_seed_contrato_templates.sql — 5 templates globais de contrato
-- ===========================================================================

-- Mensal
insert into public.contrato_templates (nome, descricao, conteudo, variaveis, is_global, agencia_id)
values (
  'Contrato Mensal',
  'Prestação de serviços de marketing com renovação mensal.',
  $html$
  <h1>Contrato de Prestação de Serviços de Marketing</h1>
  <p><strong>CONTRATANTE:</strong> {{cliente.nome_empresa}}, inscrita no CNPJ/CPF sob nº {{cliente.cnpj_cpf}}, com sede em {{cliente.endereco}}, neste ato representada por {{cliente.nome_responsavel}}.</p>
  <p><strong>CONTRATADA:</strong> {{agencia.nome_fantasia}}, inscrita no CNPJ sob nº {{agencia.cnpj}}, com sede em {{agencia.endereco}}.</p>
  <h2>Cláusula 1ª — Do objeto</h2>
  <p>A CONTRATADA prestará à CONTRATANTE serviços de marketing digital, conforme plano detalhado em anexo, incluindo: gestão de redes sociais, criação de conteúdo, monitoramento e relatórios mensais.</p>
  <h2>Cláusula 2ª — Do prazo</h2>
  <p>O presente contrato vigorará pelo prazo de {{duracao}} ({{duracao_extenso}}) meses, com início em {{data_inicio}} e término em {{data_fim}}, podendo ser renovado mediante aditivo escrito.</p>
  <h2>Cláusula 3ª — Do valor</h2>
  <p>Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor mensal de {{valor}} ({{valor_extenso}}), com vencimento todo dia {{dia_vencimento}} de cada mês.</p>
  <h2>Cláusula 4ª — Das obrigações da CONTRATADA</h2>
  <p>Prestar os serviços com zelo e diligência, entregar relatórios mensais de desempenho e manter sigilo sobre informações confidenciais da CONTRATANTE.</p>
  <h2>Cláusula 5ª — Das obrigações da CONTRATANTE</h2>
  <p>Efetuar os pagamentos nas datas acordadas, fornecer materiais e informações necessários à execução dos serviços e aprovar os conteúdos em tempo hábil.</p>
  <h2>Cláusula 6ª — Da rescisão</h2>
  <p>Qualquer das partes poderá rescindir o presente contrato mediante aviso prévio de 30 (trinta) dias, sem multa rescisória.</p>
  <h2>Cláusula 7ª — Do foro</h2>
  <p>Fica eleito o foro da comarca de {{agencia.endereco}} para dirimir quaisquer controvérsias oriundas do presente contrato.</p>
  <p style="margin-top: 60px;">{{agencia.cidade}}, {{data_assinatura}}.</p>
  <p style="margin-top: 80px;">_________________________________________<br>CONTRATANTE: {{cliente.nome_responsavel}}</p>
  <p style="margin-top: 60px;">_________________________________________<br>CONTRATADA: {{agencia.nome_fantasia}}</p>
  $html$,
  '[
    {"key":"cliente.nome_empresa","label":"Nome da empresa do cliente","type":"string"},
    {"key":"cliente.cnpj_cpf","label":"CNPJ/CPF do cliente","type":"string"},
    {"key":"cliente.endereco","label":"Endereço do cliente","type":"string"},
    {"key":"cliente.nome_responsavel","label":"Nome do responsável","type":"string"},
    {"key":"agencia.nome_fantasia","label":"Nome fantasia da agência","type":"string"},
    {"key":"agencia.cnpj","label":"CNPJ da agência","type":"string"},
    {"key":"agencia.endereco","label":"Endereço da agência","type":"string"},
    {"key":"agencia.cidade","label":"Cidade da agência","type":"string"},
    {"key":"duracao","label":"Duração (meses)","type":"number"},
    {"key":"duracao_extenso","label":"Duração por extenso","type":"string"},
    {"key":"data_inicio","label":"Data de início","type":"date"},
    {"key":"data_fim","label":"Data de término","type":"date"},
    {"key":"valor","label":"Valor mensal (R$)","type":"currency"},
    {"key":"valor_extenso","label":"Valor por extenso","type":"string"},
    {"key":"dia_vencimento","label":"Dia de vencimento","type":"number"},
    {"key":"data_assinatura","label":"Data de assinatura","type":"date"}
  ]'::jsonb,
  true,
  null
)
on conflict do nothing;
