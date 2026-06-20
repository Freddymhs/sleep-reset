/**
 * insights.ts — Pure correlation logic for the Insights panel.
 *
 * No Supabase, no React. Operates on COLLAPSED NIGHTS, never raw sleep_logs:
 * sleep_logs is N-per-date (fragmented sleep), so a naive join with the
 * 1-per-date day_context double-counts bad nights. `collapseNights` is the
 * single owner of the sleep_logs ↔ day_context merge.
 *
 * Honesty guardrails (N=1): breakdowns return null for empty categories;
 * buildCrossInsight refuses to produce a trend below INSIGHTS_MIN_NIGHTS_TREND
 * and always frames findings as ASSOCIATION, never cause.
 */

import { fromNightMinutes, toNightMinutes } from "./sleep";
import {
  ENERGY_STATE_META,
  INSIGHTS_MIN_NIGHTS_TREND,
  MENTAL_EFFORT_META,
} from "./constants";
import type {
  DayContext,
  EnergyState,
  ISODate,
  MentalEffort,
  PhysicalActivity,
  SleepLog,
  SomaticTension,
} from "./types";

/** Valid melatonin dose counts (mirrors the 1–3 DB check). */
export type DoseCount = 1 | 2 | 3;

/**
 * One collapsed night: all sessions of a single date reduced to one row, plus
 * that day's context. Only nights with a real (non-premature) wake are produced.
 */
export interface NightRow {
  date: ISODate;
  /** Night-minutes of the final non-premature wake (see toNightMinutes). */
  wakeMinutes: number;
  /** Sum of melatonin_doses across the night's completed sessions. */
  melatoninDoses: number;
  /** True when the night had >1 session or any premature wake. */
  fragmented: boolean;
  /** The day's captured context, or undefined if not logged (skippable). */
  ctx?: DayContext;
}

/** Night-minutes of a collapsed night's real wake. */
export function wakeMinutesOf(night: NightRow): number {
  return night.wakeMinutes;
}

/**
 * Collapses raw sleep_logs (N per date) into one NightRow per date, merging the
 * matching day_context by date. The night's wake is the LATEST wake_time among
 * its 'normal' completed sessions; 'premature' sessions only flag `fragmented`
 * and never contribute their wake. Nights with no normal wake are dropped.
 *
 * @param logs  Raw rows from getRecentLogs(N) — any order, may have gaps.
 * @param ctx   Rows from getRecentContext(N) — at most one per date.
 */
export function collapseNights(logs: SleepLog[], ctx: DayContext[]): NightRow[] {
  const ctxByDate = new Map<ISODate, DayContext>();
  for (const c of ctx) ctxByDate.set(c.date, c);

  const logsByDate = new Map<ISODate, SleepLog[]>();
  for (const log of logs) {
    const list = logsByDate.get(log.date) ?? [];
    list.push(log);
    logsByDate.set(log.date, list);
  }

  const nights: NightRow[] = [];

  for (const [date, dayLogs] of logsByDate) {
    const completed = dayLogs.filter((l) => l.bedtime !== null && l.wake_time !== null);
    const normalCompleted = completed.filter((l) => l.quality === "normal");

    // No real (non-premature) wake → the night has no usable awakening signal.
    if (normalCompleted.length === 0) continue;

    const finalWake = normalCompleted
      .map((l) => l.wake_time!)
      .reduce((a, b) => (a > b ? a : b));

    const melatoninDoses = completed.reduce((sum, l) => sum + l.melatonin_doses, 0);
    const fragmented = completed.length > 1 || dayLogs.some((l) => l.quality === "premature");

    nights.push({
      date,
      wakeMinutes: toNightMinutes(finalWake),
      melatoninDoses,
      fragmented,
      ctx: ctxByDate.get(date),
    });
  }

  return nights;
}

// ─── Breakdowns ────────────────────────────────────────────────────────────────

/**
 * Generic: average wake-minutes grouped by a category key. Categories with no
 * nights map to null (never divide by zero).
 */
function avgWakeByCategory<K extends string>(
  nights: NightRow[],
  keys: readonly K[],
  keyOf: (n: NightRow) => K | null | undefined,
): Record<K, number | null> {
  const buckets = new Map<K, number[]>();
  for (const k of keys) buckets.set(k, []);

  for (const night of nights) {
    const k = keyOf(night);
    if (k == null) continue;
    buckets.get(k)?.push(night.wakeMinutes);
  }

  const result = {} as Record<K, number | null>;
  for (const k of keys) {
    const vals = buckets.get(k)!;
    result[k] = vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return result;
}

const MENTAL_EFFORT_KEYS = ["light", "moderate", "heavy"] as const;
const ENERGY_STATE_KEYS = [
  "wired_overactive",
  "drained_restless",
  "clear_calm",
  "bored_idle",
] as const;
const PHYSICAL_ACTIVITY_KEYS = ["none", "light", "moderate", "intense"] as const;
const SOMATIC_TENSION_KEYS = ["relaxed", "tense"] as const;
const DOSE_KEYS: readonly DoseCount[] = [1, 2, 3] as const;

/** Mean wake-minutes per mental_effort level. Null where no data. */
export function effortBreakdown(nights: NightRow[]): Record<MentalEffort, number | null> {
  return avgWakeByCategory(nights, MENTAL_EFFORT_KEYS, (n) => n.ctx?.mental_effort ?? null);
}

/** Mean wake-minutes per energy_state. Null where no data. */
export function energyBreakdown(nights: NightRow[]): Record<EnergyState, number | null> {
  return avgWakeByCategory(nights, ENERGY_STATE_KEYS, (n) => n.ctx?.energy_state ?? null);
}

/** Mean wake-minutes per physical_activity level. Null where no data. */
export function activityBreakdown(nights: NightRow[]): Record<PhysicalActivity, number | null> {
  return avgWakeByCategory(nights, PHYSICAL_ACTIVITY_KEYS, (n) => n.ctx?.physical_activity ?? null);
}

/** Mean wake-minutes per somatic_tension. Null where no data. */
export function tensionBreakdown(nights: NightRow[]): Record<SomaticTension, number | null> {
  return avgWakeByCategory(nights, SOMATIC_TENSION_KEYS, (n) => n.ctx?.somatic_tension ?? null);
}

/** Mean wake-minutes per melatonin dose count (1/2/3). Null where no data. */
export function dosesBreakdown(nights: NightRow[]): Record<DoseCount, number | null> {
  const buckets = new Map<DoseCount, number[]>(DOSE_KEYS.map((k) => [k, []]));
  for (const night of nights) {
    const dose = Math.min(Math.max(night.melatoninDoses, 1), 3) as DoseCount;
    buckets.get(dose)!.push(night.wakeMinutes);
  }
  const result = {} as Record<DoseCount, number | null>;
  for (const k of DOSE_KEYS) {
    const vals = buckets.get(k)!;
    result[k] = vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return result;
}

// ─── Cross insight ───────────────────────────────────────────────────────────

/**
 * Returns the category with the EARLIEST mean wake (lowest minutes = best),
 * ignoring null buckets. Null if every bucket is empty.
 */
function bestCategory<K extends string>(breakdown: Record<K, number | null>): K | null {
  const present = (Object.keys(breakdown) as K[])
    .map((key) => [key, breakdown[key]] as const)
    .filter((entry): entry is readonly [K, number] => entry[1] !== null);

  if (present.length === 0) return null;
  return present.reduce((best, cur) => (cur[1] < best[1] ? cur : best))[0];
}

/**
 * Builds a coaching-style ASSOCIATION string (never causal). Below the trend
 * gate (INSIGHTS_MIN_NIGHTS_TREND nights with context) it returns the
 * keep-logging message instead of a pattern read from noise.
 */
export function buildCrossInsight(nights: NightRow[]): string {
  const withCtx = nights.filter((n) => n.ctx !== undefined);

  if (withCtx.length < INSIGHTS_MIN_NIGHTS_TREND) {
    const missing = INSIGHTS_MIN_NIGHTS_TREND - withCtx.length;
    return `Seguí registrando — faltan ${missing} ${missing === 1 ? "noche" : "noches"} con contexto para ver patrones.`;
  }

  const bestEffort = bestCategory(effortBreakdown(withCtx));
  const bestEnergy = bestCategory(energyBreakdown(withCtx));
  const effortAvg = bestEffort ? effortBreakdown(withCtx)[bestEffort] : null;

  if (!bestEffort || !bestEnergy || effortAvg === null) {
    return "Necesitás más variedad de días registrados para detectar una asociación.";
  }

  const wakeLabel = fromNightMinutes(effortAvg);
  const effortLabel = MENTAL_EFFORT_META[bestEffort].label;
  const energyLabel = ENERGY_STATE_META[bestEnergy].label;

  return (
    `Tus despertares más tempranos (~${wakeLabel}) se asocian con esfuerzo ` +
    `${effortLabel} y estado ${energyLabel}. ` +
    `Asociación en ${withCtx.length} noches — no implica causa.`
  );
}
