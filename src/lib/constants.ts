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
} as const;

/** Minutes the wake anchor advances each Monday toward the target wake time. */
export const WAKE_ANCHOR_ADVANCE_MINUTES = 20 as const;

/** Table names — prevents magic strings across data-access hooks. */
export const DB_TABLES = {
  SLEEP_LOGS: "sleep_logs",
  SLEEP_GOALS: "sleep_goals",
} as const;
