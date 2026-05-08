-- Migration 003: agrega columna quality a sleep_logs
-- 'normal'    → noche completa o despertar esperado
-- 'premature' → despertar prematuro (no pudo volver a dormir)

alter table sleep_logs
  add column quality text not null default 'normal';

alter table sleep_logs
  add constraint sleep_logs_quality_check
  check (quality in ('normal', 'premature'));
