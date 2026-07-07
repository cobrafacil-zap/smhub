-- ===========================================================================
-- 0004_seed_holidays.sql — Datas comemorativas 2026-2030 (subset)
-- Pode ser estendido via UI admin.
-- ===========================================================================

insert into public.datas_comemorativas (data, nome, segmento) values
  ('2026-01-01', 'Confraternização Universal', '{"geral"}'),
  ('2026-02-14', 'Dia de São Valentim', '{"geral","varejo","educacao"}'),
  ('2026-03-08', 'Dia Internacional da Mulher', '{"geral","varejo","educacao","saude"}'),
  ('2026-04-21', 'Tiradentes', '{"geral"}'),
  ('2026-05-10', 'Dia das Mães', '{"geral","varejo","educacao","saude"}'),
  ('2026-06-12', 'Dia dos Namorados', '{"geral","varejo"}'),
  ('2026-07-20', 'Dia do Amigo', '{"geral"}'),
  ('2026-08-11', 'Dia dos Pais', '{"geral","varejo","educacao"}'),
  ('2026-09-07', 'Dia da Independência', '{"geral","educacao"}'),
  ('2026-10-12', 'Dia das Crianças', '{"geral","varejo","educacao"}'),
  ('2026-10-31', 'Halloween', '{"geral","varejo"}'),
  ('2026-11-02', 'Finados', '{"geral"}'),
  ('2026-11-15', 'Proclamação da República', '{"geral","educacao"}'),
  ('2026-12-25', 'Natal', '{"geral","varejo","educacao"}'),
  ('2027-01-01', 'Confraternização Universal', '{"geral"}'),
  ('2027-02-14', 'Dia de São Valentim', '{"geral","varejo","educacao"}'),
  ('2027-03-08', 'Dia Internacional da Mulher', '{"geral","varejo","educacao","saude"}'),
  ('2027-05-09', 'Dia das Mães', '{"geral","varejo","educacao","saude"}'),
  ('2027-06-12', 'Dia dos Namorados', '{"geral","varejo"}'),
  ('2027-08-08', 'Dia dos Pais', '{"geral","varejo","educacao"}'),
  ('2027-10-12', 'Dia das Crianças', '{"geral","varejo","educacao"}'),
  ('2027-12-25', 'Natal', '{"geral","varejo","educacao"}')
on conflict do nothing;
