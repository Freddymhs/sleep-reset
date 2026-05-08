-- Migration 001: sleep_logs + sleep_goals con RLS

-- ─── sleep_logs ───────────────────────────────────────────────────────────────

create table sleep_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  date       date        not null,
  bedtime    timestamptz,
  wake_time  timestamptz,
  source     text        not null default 'manual',
  notes      text,
  created_at timestamptz not null default now()
);

create index sleep_logs_user_date_idx on sleep_logs (user_id, date);

alter table sleep_logs enable row level security;

create policy "sleep_logs: select own" on sleep_logs
  for select using (auth.uid() = user_id);

create policy "sleep_logs: insert own" on sleep_logs
  for insert with check (auth.uid() = user_id);

create policy "sleep_logs: update own" on sleep_logs
  for update using (auth.uid() = user_id);

create policy "sleep_logs: delete own" on sleep_logs
  for delete using (auth.uid() = user_id);

-- ─── sleep_goals ──────────────────────────────────────────────────────────────

create table sleep_goals (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  -- Metas finales (Fase B)
  target_wake_time    time        not null,
  target_bedtime      time        not null,
  -- Primera meta alcanzable (Fase A — probada con trabajo)
  phase_a_wake        time        not null,
  -- Wake anchor de la semana actual (avanza 20 min cada lunes)
  current_wake_anchor time        not null,
  -- Pilar 1: melatonina
  melatonin_enabled   boolean     not null default true,
  melatonin_dose_mg   numeric(4,2) not null default 0.5,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table sleep_goals enable row level security;

create policy "sleep_goals: select own" on sleep_goals
  for select using (auth.uid() = user_id);

create policy "sleep_goals: insert own" on sleep_goals
  for insert with check (auth.uid() = user_id);

create policy "sleep_goals: update own" on sleep_goals
  for update using (auth.uid() = user_id);

create policy "sleep_goals: delete own" on sleep_goals
  for delete using (auth.uid() = user_id);
