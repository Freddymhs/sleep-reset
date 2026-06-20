-- Migration 005: day_context + sleep_logs.melatonin_doses
--
-- day_context captura señales UPSTREAM del día (esfuerzo cognitivo, estado de
-- energía/ánimo, actividad física, tensión somática) para correlacionarlas con
-- la calidad del despertar. Es 1 fila por día (a diferencia de sleep_logs, que
-- es N por día desde la migration 004). La divergencia es deliberada:
-- contexto = 1/día (upsert), sesiones de sueño = N/día.
--
-- Todas las columnas de enum son NULLABLE: la captura es parcial y skippable
-- (el usuario puede tocar unas dimensiones y otras no). La correlación tolera
-- nulos.

-- ─── day_context ──────────────────────────────────────────────────────────────

create table day_context (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  date              date        not null,
  -- Esfuerzo cognitivo del día (ordinal 3 niveles).
  mental_effort     text,
  -- Estado de energía/ánimo al final del día (4 estados).
  energy_state      text,
  -- Actividad física del día (ordinal 4 niveles).
  physical_activity text,
  -- Tensión corporal al acostarse (binario).
  somatic_tension   text,
  notes             text,
  created_at        timestamptz not null default now(),
  -- updated_at: day_context la introduce nueva (sleep_logs NO la tiene). NO hay
  -- trigger en DB — el cliente la setea explícitamente en cada UPDATE
  -- (convención de sleep_goals). Esto es deliberado, no copia de sleep_logs.
  updated_at        timestamptz not null default now(),
  -- 1 fila por día → upsert por (user_id, date). Distinto de sleep_logs, que
  -- perdió su unique en 004 a propósito (sesiones N/día).
  unique (user_id, date),
  constraint day_context_mental_effort_check
    check (mental_effort in ('light', 'moderate', 'heavy')),
  constraint day_context_energy_state_check
    check (energy_state in ('wired_overactive', 'drained_restless', 'clear_calm', 'bored_idle')),
  constraint day_context_physical_activity_check
    check (physical_activity in ('none', 'light', 'moderate', 'intense')),
  constraint day_context_somatic_tension_check
    check (somatic_tension in ('relaxed', 'tense'))
);

create index day_context_user_date_idx on day_context (user_id, date);

alter table day_context enable row level security;

create policy "day_context: select own" on day_context
  for select using (auth.uid() = user_id);

create policy "day_context: insert own" on day_context
  for insert with check (auth.uid() = user_id);

create policy "day_context: update own" on day_context
  for update using (auth.uid() = user_id);

create policy "day_context: delete own" on day_context
  for delete using (auth.uid() = user_id);

-- ─── sleep_logs.melatonin_doses ───────────────────────────────────────────────
-- Dosis de melatonina por sesión. Refleja el protocolo real (uso hipnótico 3mg,
-- +1 dosis/hora si no logra dormir, máx 3 históricamente, casi siempre 2).
-- Descriptivo, no normativo. Por sesión; se SUMA al colapsar la noche.

alter table sleep_logs
  add column melatonin_doses smallint not null default 1;

alter table sleep_logs
  add constraint sleep_logs_melatonin_doses_check
  check (melatonin_doses between 1 and 3);
