-- ===========================================================================
-- 0033_entrada_responsavel.sql
-- ===========================================================================
-- Permite atribuir uma entrada do planejamento (post/story/reels/...) a um
-- membro da equipe (ex.: o designer responsável por produzir a peça).
-- Coluna simples e anulável — um responsável por entrada.
-- ===========================================================================

alter table public.planejamento_entradas
  add column if not exists responsavel_id uuid references public.usuarios(id) on delete set null;

create index if not exists idx_entradas_responsavel on public.planejamento_entradas(responsavel_id);