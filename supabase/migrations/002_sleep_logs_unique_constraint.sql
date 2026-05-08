-- Migration 002: unique constraint en sleep_logs(user_id, date)
-- Necesario para que el upsert en logBedtime() funcione correctamente.
-- El índice previo (sleep_logs_user_date_idx) no es suficiente para ON CONFLICT.

alter table sleep_logs
  add constraint sleep_logs_user_date_unique unique (user_id, date);
