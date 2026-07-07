-- ===========================================================================
-- 0020_planejamento_cor_estilo.sql
-- ===========================================================================
-- Adiciona cor (hex) e estilo (rótulo livre) às entradas do planejamento
-- editorial, pra diferenciar visualmente os conteúdos no calendário.
-- ===========================================================================

alter table public.planejamento_entradas
  add column if not exists cor text,
  add column if not exists estilo text;

comment on column public.planejamento_entradas.cor is 'Cor (hex) opcional pra diferenciar o post no calendário';
comment on column public.planejamento_entradas.estilo is 'Estilo/rotulo livre (ex: Promoção, Educativo, Institucional)';