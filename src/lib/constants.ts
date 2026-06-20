/**
 * Storage keys — single source of truth for chrome.storage.local keys.
 * Import from here instead of hardcoding strings at call sites.
 */
export const STORAGE_KEYS = {
  /** Persisted Supabase session — used by useAuth and background auth handler. */
  SUPABASE_SESSION: "supabase_session",
  /**
   * ISO date (YYYY-MM-DD) of the last Monday on which the wake anchor was
   * advanced. Used by useSleepGoal to prevent double-advancing in the same week.
   */
  LAST_ANCHOR_ADVANCE_DATE: "last_anchor_advance_date",
  /** True once the user has dismissed the first-setup coaching tip. */
  COACHING_FIRST_SETUP_DISMISSED: "coaching_first_setup_dismissed",
  /** ISO date of the last day the phase_advance coaching tip was shown. */
  COACHING_PHASE_ADVANCE_PENDING: "coaching_phase_advance_pending",
} as const;

/** Hours window for the premature_wake coaching tip — shown if last log was within this window. */
export const PREMATURE_TIP_WINDOW_HOURS = 8 as const;

/** Minimum count of premature awakenings in 7 days to trigger the streak_break tip. */
export const PREMATURE_STREAK_THRESHOLD = 3 as const;

/**
 * Minimum sleep duration in minutes to accept a session.
 * Below this is treated as a misclick — user should use "Anular esta noche".
 */
export const MIN_SESSION_MINUTES = 5 as const;

/** Minutes the wake anchor advances each Monday toward the target wake time. */
export const WAKE_ANCHOR_ADVANCE_MINUTES = 20 as const;

/** Minutes ahead of the wake anchor during which the light banner is shown. */
export const LIGHT_BANNER_WINDOW_MINUTES = 30 as const;

/** Minutes subtracted from avg bedtime to compute melatonin time (5.5 hours). */
export const MELATONIN_OFFSET_MINUTES = 330 as const;

/**
 * Max minutes a nightly bedtime recommendation can shift toward the target
 * in a single night.
 */
export const MAX_BEDTIME_SHIFT_MINUTES = 30 as const;

/** Number of recent sleep logs used when computing averages. */
export const RECENT_LOGS_COUNT = 3 as const;

/**
 * Minutes threshold for "night hours" crossover.
 * Hours < NIGHT_HOUR_THRESHOLD are treated as post-midnight (add 1440 min).
 */
export const NIGHT_HOUR_THRESHOLD = 12 as const;

/** Minutes in a full day (24 * 60). */
export const MINUTES_PER_DAY = 1440 as const;

/** Table names — prevents magic strings across data-access hooks. */
export const DB_TABLES = {
  SLEEP_LOGS: "sleep_logs",
  SLEEP_GOALS: "sleep_goals",
  DAY_CONTEXT: "day_context",
} as const;

// ─── Day-context enum metadata (label ES + color + emoji) ──────────────────────
// Single source of truth for how each enum value renders across capture chips,
// history overlay, and the insights panel.

import type {
  MentalEffort,
  EnergyState,
  PhysicalActivity,
  SomaticTension,
} from "./types";

/** Spanish label + Tailwind bg color + emoji per mental_effort value. */
export const MENTAL_EFFORT_META: Record<
  MentalEffort,
  { label: string; color: string; emoji: string }
> = {
  light: { label: "Menor", color: "bg-emerald-500", emoji: "🌱" },
  moderate: { label: "Moderado", color: "bg-amber-500", emoji: "⚖️" },
  heavy: { label: "Mayor", color: "bg-rose-500", emoji: "🔥" },
} as const;

/** Spanish label + Tailwind bg color + emoji per energy_state value. */
export const ENERGY_STATE_META: Record<
  EnergyState,
  { label: string; color: string; emoji: string }
> = {
  wired_overactive: { label: "Hiperactivo", color: "bg-orange-500", emoji: "⚡" },
  drained_restless: { label: "Exhausto", color: "bg-purple-500", emoji: "🥀" },
  clear_calm: { label: "Lúcido", color: "bg-sky-500", emoji: "🧘" },
  bored_idle: { label: "Aburrido", color: "bg-slate-400", emoji: "😐" },
} as const;

/** Spanish label + Tailwind bg color + emoji per physical_activity value. */
export const PHYSICAL_ACTIVITY_META: Record<
  PhysicalActivity,
  { label: string; color: string; emoji: string }
> = {
  none: { label: "Nada", color: "bg-slate-400", emoji: "🛋️" },
  light: { label: "Poca", color: "bg-emerald-400", emoji: "🚶" },
  moderate: { label: "Moderada", color: "bg-emerald-500", emoji: "🏃" },
  intense: { label: "Intensa", color: "bg-emerald-600", emoji: "💪" },
} as const;

/** Spanish label + Tailwind bg color + emoji per somatic_tension value. */
export const SOMATIC_TENSION_META: Record<
  SomaticTension,
  { label: string; color: string; emoji: string }
> = {
  relaxed: { label: "Relajado", color: "bg-sky-500", emoji: "😌" },
  tense: { label: "Tenso", color: "bg-rose-500", emoji: "😣" },
} as const;

/**
 * Wake-time range that scales the insights Y axis. No binary cutoff — earlier
 * within the range is "better" (lower wakeMinutes average).
 */
export const WAKE_RANGE = { from: "04:00", to: "06:00" } as const;

/** Valid melatonin dose count per session (see migration 005). */
export const MELATONIN_DOSES_RANGE = { min: 1, max: 3 } as const;

/**
 * Minimum nights with data before the insights panel shows raw points.
 * Below this: empty state only.
 */
export const INSIGHTS_MIN_NIGHTS_POINTS = 7 as const;

/**
 * Nights with data required before showing trend + N-of-1 disclaimer.
 * Below this (but ≥ POINTS): "keep logging" message.
 */
export const INSIGHTS_MIN_NIGHTS_TREND = 14 as const;
