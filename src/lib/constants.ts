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
} as const;
