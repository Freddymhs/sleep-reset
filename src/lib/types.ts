/**
 * Domain types — single source of truth for all DB entities and derived types.
 * Mirrors the schema defined in supabase/migrations/001_sleep_tables.sql.
 *
 * updated_at is not managed by a DB trigger — the client must pass it
 * explicitly on every UPDATE (e.g. { updated_at: new Date().toISOString() }).
 */

// ─── Primitives ────────────────────────────────────────────────────────────────

/** ISO 8601 date string (YYYY-MM-DD). */
export type ISODate = string;

/** ISO 8601 datetime string with timezone (timestamptz). */
export type ISODatetime = string;

/** Time string (HH:MM:SS) — maps to Postgres `time` type. */
export type TimeString = string;

/** Source of a sleep log entry. */
export type SleepLogSource = "manual" | "import";

/** Quality flag for a sleep log — affects history visualization, not algorithm averages. */
export type SleepQuality = "normal" | "premature";

// ─── SleepLog ──────────────────────────────────────────────────────────────────

/** Matches the `sleep_logs` table row. */
export interface SleepLog {
  id: string;
  user_id: string;
  date: ISODate;
  bedtime: ISODatetime | null;
  wake_time: ISODatetime | null;
  /** How the entry was created. */
  source: SleepLogSource;
  notes: string | null;
  /** Quality flag — 'premature' marks nights with early forced wake. */
  quality: SleepQuality;
  created_at: ISODatetime;
}

/** Payload for inserting a new sleep log (id and created_at are DB-generated). */
export type NewSleepLog = Omit<SleepLog, "id" | "created_at">;

/** Payload for updating an existing sleep log. */
export type UpdateSleepLog = Partial<Omit<SleepLog, "id" | "user_id" | "created_at">>;

// ─── SleepGoal ─────────────────────────────────────────────────────────────────

/** Matches the `sleep_goals` table row. */
export interface SleepGoal {
  id: string;
  user_id: string;
  /** Final target wake time (Phase B goal). */
  target_wake_time: TimeString;
  /** Final target bedtime (Phase B goal). */
  target_bedtime: TimeString;
  /** First achievable wake time goal (Phase A — proven with work). */
  phase_a_wake: TimeString;
  /** Current week's wake anchor — advances 20 min every Monday. */
  current_wake_anchor: TimeString;
  /** Whether melatonin supplementation is enabled. */
  melatonin_enabled: boolean;
  /** Melatonin dose in mg. */
  melatonin_dose_mg: number;
  created_at: ISODatetime;
  /** Must be set explicitly by the client on every UPDATE. */
  updated_at: ISODatetime;
}

/** Payload for inserting a new sleep goal (id and timestamps are DB-generated). */
export type NewSleepGoal = Omit<SleepGoal, "id" | "created_at" | "updated_at">;

/** Payload for updating an existing sleep goal. */
export type UpdateSleepGoal = Partial<Omit<SleepGoal, "id" | "user_id" | "created_at">> & {
  /** Required on every update — DB has no trigger for this column. */
  updated_at: ISODatetime;
};

// ─── Recommendation ────────────────────────────────────────────────────────────

/**
 * Nightly recommendation computed by the gradual-shift algorithm.
 * Max shift: 30 min per night toward the current_wake_anchor goal.
 */
export interface Recommendation {
  /** The date this recommendation applies to. */
  date: ISODate;
  /** Recommended bedtime for tonight. */
  suggested_bedtime: ISODatetime;
  /** Recommended wake time for tomorrow. */
  suggested_wake_time: ISODatetime;
  /**
   * Minutes shifted from the previous night's wake time.
   * Positive = earlier, negative = later.
   */
  shift_minutes: number;
  /** Whether the user has reached their current_wake_anchor. */
  anchor_reached: boolean;
}

// ─── Protocol Recommendation ───────────────────────────────────────────────────

/**
 * The 3-pillar nightly protocol recommendation computed from recent sleep logs.
 * Shown in ProtocolCard on the home screen.
 */
export interface ProtocolRecommendation {
  /**
   * Suggested bedtime tonight as "HH:MM".
   * Average of recent bedtimes shifted up to 30 min toward target.
   */
  suggestedBedtime: string;
  /**
   * Recommended melatonin time as "HH:MM", or null if not enough data.
   * Computed as avg bedtime − 5.5 hours.
   */
  melatoninTime: string | null;
  /**
   * Current week's wake anchor as "HH:MM" from the active SleepGoal.
   */
  wakeAnchor: string;
  /**
   * True if the user has already reached the target bedtime (within 0 min).
   */
  phaseAComplete: boolean;
}
