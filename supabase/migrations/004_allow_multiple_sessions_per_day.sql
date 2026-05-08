-- Migration 004: permite múltiples sleep_logs por día
-- DSPD a menudo causa fragmentación de sueño — un usuario puede dormir, despertar
-- prematuramente, y volver a intentar dormir esa misma noche. Cada intento
-- debe ser un registro independiente.

alter table sleep_logs
  drop constraint sleep_logs_user_date_unique;

-- El índice no-único en (user_id, date) ya existe (sleep_logs_user_date_idx).
-- Lo mantenemos para queries de rango eficientes.
