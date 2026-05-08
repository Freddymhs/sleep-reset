/**
 * sleep.ts — Pure functions for sleep-time calculations.
 * No side effects, no imports from outside this lib.
 */

import {
  LIGHT_BANNER_WINDOW_MINUTES,
  MAX_BEDTIME_SHIFT_MINUTES,
  MELATONIN_OFFSET_MINUTES,
  MINUTES_PER_DAY,
  NIGHT_HOUR_THRESHOLD,
  RECENT_LOGS_COUNT,
} from "./constants";
import type { ISODate, ISODatetime, ProtocolRecommendation, SleepGoal, SleepLog, TimeString } from "./types";

/**
 * Formats a timestamptz ISO string to a local HH:MM string.
 * Example: "2026-05-07T02:30:00+00:00" → "02:30" (in local timezone).
 */
export function formatTime(isoDatetime: ISODatetime): string {
  const date = new Date(isoDatetime);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Calculates the human-readable sleep duration between bedtime and wake time.
 * Handles the cross-midnight case (wake time < bedtime in wall clock terms).
 *
 * @returns Duration string like "7h 30m" or "8h 00m".
 */
export function calcDuration(bedtime: ISODatetime, wakeTime: ISODatetime): string {
  const bedMs = new Date(bedtime).getTime();
  const wakeMs = new Date(wakeTime).getTime();

  const diffMs = wakeMs - bedMs;
  const totalMinutes = Math.max(0, Math.round(diffMs / 60_000));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

// ─── Night-minutes helpers ─────────────────────────────────────────────────────

/**
 * Converts an ISO timestamp to "night minutes" — a linear scale that keeps
 * sleep sessions contiguous across midnight.
 *
 * Rule: hours < NIGHT_HOUR_THRESHOLD (12) are treated as post-midnight.
 *   23:30 → 1410  (PM, before midnight)
 *   00:00 → 1440  (midnight exact)
 *   02:00 → 1560  (AM, after midnight)
 */
export function toNightMinutes(isoTimestamp: ISODatetime): number {
  const date = new Date(isoTimestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const minutesSinceMidnight = hours * 60 + minutes;
  const isPostMidnight = hours < NIGHT_HOUR_THRESHOLD;
  return isPostMidnight ? minutesSinceMidnight + MINUTES_PER_DAY : minutesSinceMidnight;
}

/**
 * Inverse of toNightMinutes — converts night minutes back to "HH:MM".
 *   1560 → "02:00"
 *   1410 → "23:30"
 *   1440 → "00:00"
 */
export function fromNightMinutes(nightMinutes: number): string {
  // Round first — averages can produce fractional minutes that would render
  // as "21.5" without this normalization.
  const rounded = Math.round(nightMinutes);
  const wrapped = ((rounded % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(wrapped / 60).toString().padStart(2, "0");
  const m = (wrapped % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ─── Melatonin time ───────────────────────────────────────────────────────────

/**
 * Computes the recommended melatonin time from the most recent sleep logs.
 *
 * Uses up to RECENT_LOGS_COUNT logs with a non-null bedtime.
 * Formula: avg(nightMinutes(bedtime)) − MELATONIN_OFFSET_MINUTES (5.5 h).
 *
 * Returns null when there are no logs with a recorded bedtime.
 */
export function calcMelatoninTime(recentLogs: SleepLog[]): string | null {
  const logsWithBedtime = recentLogs
    .filter((log): log is SleepLog & { bedtime: ISODatetime } => log.bedtime !== null)
    .slice(0, RECENT_LOGS_COUNT);

  if (logsWithBedtime.length === 0) return null;

  const totalNightMinutes = logsWithBedtime.reduce(
    (sum, log) => sum + toNightMinutes(log.bedtime),
    0,
  );
  const avgNightMinutes = totalNightMinutes / logsWithBedtime.length;
  const melatoninMinutes = avgNightMinutes - MELATONIN_OFFSET_MINUTES;

  return fromNightMinutes(melatoninMinutes);
}

// ─── Light banner ─────────────────────────────────────────────────────────────

/**
 * Converts a "HH:MM" or "HH:MM:SS" TimeString to minutes since midnight (0–1439).
 */
function timeStringToMinutes(time: TimeString): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Returns true when the current time is within the morning light window:
 * wake_anchor ≤ now ≤ wake_anchor + LIGHT_BANNER_WINDOW_MINUTES.
 *
 * Only shows AFTER waking up, not the whole night before.
 */
export function shouldShowLightBanner(goal: SleepGoal, now: Date): boolean {
  const wakeAnchorMin = timeStringToMinutes(goal.current_wake_anchor);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= wakeAnchorMin && nowMin <= wakeAnchorMin + LIGHT_BANNER_WINDOW_MINUTES;
}

// ─── TimeString night-minutes helper ──────────────────────────────────────────

/**
 * Same crossover rule as toNightMinutes, but accepts a "HH:MM" TimeString
 * instead of an ISO timestamp.
 *   "23:30" → 1410, "00:00" → 1440, "02:00" → 1560
 */
function timeStringToNightMinutes(time: TimeString): number {
  const [hours, minutes] = time.split(":").map(Number);
  const minutesSinceMidnight = hours * 60 + minutes;
  const isPostMidnight = hours < NIGHT_HOUR_THRESHOLD;
  return isPostMidnight ? minutesSinceMidnight + MINUTES_PER_DAY : minutesSinceMidnight;
}

// ─── Bedtime recommendation ───────────────────────────────────────────────────

/**
 * Computes the full 3-pillar protocol recommendation from recent sleep logs.
 *
 * Algorithm:
 *   1. avgBedtime = avg nightMinutes of up to RECENT_LOGS_COUNT logs with bedtime
 *   2. diff = avgBedtime − targetBedtimeMin (how far from goal)
 *   3. suggestedMin = avgBedtime − min(diff, MAX_BEDTIME_SHIFT_MINUTES)
 *
 * Returns null when there are no logs with a recorded bedtime.
 */
export function calcBedtimeRecommendation(
  recentLogs: SleepLog[],
  goal: SleepGoal,
): ProtocolRecommendation | null {
  const logsWithBedtime = recentLogs
    .filter((log): log is SleepLog & { bedtime: ISODatetime } => log.bedtime !== null)
    .slice(0, RECENT_LOGS_COUNT);

  if (logsWithBedtime.length === 0) return null;

  const totalNightMinutes = logsWithBedtime.reduce(
    (sum, log) => sum + toNightMinutes(log.bedtime),
    0,
  );
  const avgBedtimeMin = totalNightMinutes / logsWithBedtime.length;
  // Convert target_bedtime TimeString ("HH:MM") to night minutes using the same rule.
  const targetBedtimeMin = timeStringToNightMinutes(goal.target_bedtime);

  const diff = avgBedtimeMin - targetBedtimeMin;
  const shift = Math.min(Math.max(diff, 0), MAX_BEDTIME_SHIFT_MINUTES);
  // Never suggest earlier than the target bedtime
  const suggestedMin = Math.max(avgBedtimeMin - shift, targetBedtimeMin);

  const wakeAnchor = goal.current_wake_anchor.slice(0, 5); // normalize to HH:MM
  const melatoninTime = calcMelatoninTime(recentLogs);
  const phaseAComplete = diff <= 0;

  return {
    suggestedBedtime: fromNightMinutes(suggestedMin),
    melatoninTime,
    wakeAnchor,
    phaseAComplete,
  };
}

// ─── Sleep duration (minutes) ─────────────────────────────────────────────────

/**
 * Returns the sleep duration in minutes for a single log, or null when either
 * bedtime or wake_time is missing.
 */
export function calcDurationMinutes(log: SleepLog): number | null {
  if (!log.bedtime || !log.wake_time) return null;
  const bedMs = new Date(log.bedtime).getTime();
  const wakeMs = new Date(log.wake_time).getTime();
  return Math.max(0, Math.round((wakeMs - bedMs) / 60_000));
}

// ─── Week stats ────────────────────────────────────────────────────────────────

/** Colour class for a bar given sleep duration (minutes), or null for no data. */
export type SleepBarColor = "green" | "yellow" | "red" | "gray";

const SLEEP_DURATION_GREEN_THRESHOLD_MINUTES = 7 * 60; // ≥ 7h
const SLEEP_DURATION_YELLOW_THRESHOLD_MINUTES = 5 * 60; // ≥ 5h (< 7h is yellow)

/** Returns the colour bucket for a duration in minutes, or "gray" if null. */
export function sleepBarColor(durationMinutes: number | null): SleepBarColor {
  if (durationMinutes === null) return "gray";
  if (durationMinutes >= SLEEP_DURATION_GREEN_THRESHOLD_MINUTES) return "green";
  if (durationMinutes >= SLEEP_DURATION_YELLOW_THRESHOLD_MINUTES) return "yellow";
  return "red";
}

/** One cell in the 7-day chart — always present, even for days without data. */
export interface DaySlot {
  /** ISO date string (YYYY-MM-DD). */
  date: ISODate;
  /** Abbreviated weekday in Spanish locale ("Lun", "Mar", …). */
  label: string;
  /** Duration in minutes, or null when no complete log exists. */
  durationMinutes: number | null;
  /** Colour of the bar/indicator. */
  color: SleepBarColor;
  /** Formatted duration string like "7h 30m", or null. */
  durationLabel: string | null;
  /** Formatted bedtime "HH:MM" for the tooltip, or null. */
  bedtimeLabel: string | null;
  /** Formatted wake time "HH:MM" for the tooltip, or null. */
  wakeTimeLabel: string | null;
}

const WEEKDAY_LABELS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
const DAYS_IN_HISTORY = 7 as const;

/**
 * Parses a "YYYY-MM-DD" string as a local-timezone Date (NOT UTC, which is
 * what `new Date("YYYY-MM-DD")` does — that bug shifts the calendar by 1 day
 * in negative-UTC timezones).
 */
function parseLocalDate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Formats a Date as "YYYY-MM-DD" in local timezone. */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Builds a 7-element array of DaySlot (most recent last) from a raw SleepLog
 * array that may have gaps OR multiple sessions per date (DSPD users may
 * sleep morning + night). When multiple sessions exist for a date, they are
 * aggregated: total duration sum, earliest bedtime, latest wake_time, and
 * 'premature' quality if any session was premature.
 *
 * @param logs  Raw rows from getRecentLogs(N) — any order, may have gaps.
 * @param today ISO date of "today" (YYYY-MM-DD). Defaults to current local date.
 */
export function buildDaySlots(logs: SleepLog[], today?: ISODate): DaySlot[] {
  const todayDate = today ?? formatLocalDate(new Date());

  // Group logs by date — multiple sessions per date are valid.
  const logsByDate = new Map<string, SleepLog[]>();
  for (const log of logs) {
    const list = logsByDate.get(log.date) ?? [];
    list.push(log);
    logsByDate.set(log.date, list);
  }

  const slots: DaySlot[] = [];
  const todayParsed = parseLocalDate(todayDate);

  for (let i = DAYS_IN_HISTORY - 1; i >= 0; i--) {
    const d = new Date(todayParsed);
    d.setDate(d.getDate() - i);
    const isoDate = formatLocalDate(d);
    const label = WEEKDAY_LABELS_ES[d.getDay()];

    const dayLogs = logsByDate.get(isoDate) ?? [];
    const completeLogs = dayLogs.filter((l) => l.bedtime !== null && l.wake_time !== null);

    if (completeLogs.length === 0) {
      slots.push({
        date: isoDate,
        label,
        durationMinutes: null,
        color: "gray",
        durationLabel: null,
        bedtimeLabel: null,
        wakeTimeLabel: null,
      });
      continue;
    }

    // Aggregate: sum durations, earliest bedtime, latest wake.
    const totalMinutes = completeLogs.reduce(
      (sum, l) => sum + (calcDurationMinutes(l) ?? 0),
      0,
    );
    const earliestBedtime = completeLogs
      .map((l) => l.bedtime!)
      .reduce((a, b) => (a < b ? a : b));
    const latestWake = completeLogs
      .map((l) => l.wake_time!)
      .reduce((a, b) => (a > b ? a : b));

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const durationLabel = `${hours}h ${mins.toString().padStart(2, "0")}m`;

    slots.push({
      date: isoDate,
      label,
      durationMinutes: totalMinutes,
      color: sleepBarColor(totalMinutes),
      durationLabel,
      bedtimeLabel: formatTime(earliestBedtime),
      wakeTimeLabel: formatTime(latestWake),
    });
  }

  return slots;
}

/** Aggregate statistics computed from a 7-day log set. */
export interface WeekStats {
  /** Average sleep duration in minutes across days with complete data, or null. */
  avgMinutes: number | null;
  /** Human-readable avg string like "7h 15m", or null. */
  avgLabel: string | null;
  /** Date of the best (longest) sleep day among the 7, or null. */
  bestDate: ISODate | null;
  /** Duration of the best day formatted as "8h 00m", or null. */
  bestLabel: string | null;
  /** Number of consecutive days (ending today) with at least a bedtime logged. */
  streakDays: number;
}

/**
 * Computes aggregate statistics for the week given a set of DaySlots (built
 * with buildDaySlots). Only slots with complete data (both bedtime and wake)
 * are counted toward avg and best.
 */
export function calcWeekStats(slots: DaySlot[]): WeekStats {
  const completeSlots = slots.filter((s) => s.durationMinutes !== null);

  if (completeSlots.length === 0) {
    return { avgMinutes: null, avgLabel: null, bestDate: null, bestLabel: null, streakDays: 0 };
  }

  const totalMinutes = completeSlots.reduce((sum, s) => sum + s.durationMinutes!, 0);
  const avgMinutes = Math.round(totalMinutes / completeSlots.length);
  const avgHours = Math.floor(avgMinutes / 60);
  const avgMins = avgMinutes % 60;
  const avgLabel = `${avgHours}h ${avgMins.toString().padStart(2, "0")}m`;

  const bestSlot = completeSlots.reduce((best, s) =>
    s.durationMinutes! > best.durationMinutes! ? s : best,
  );

  // Streak: count consecutive days ending today where bedtime or wake was logged
  // (uses durationMinutes to detect any complete record)
  const slotsNewestFirst = [...slots].reverse();
  let streakDays = 0;
  for (const slot of slotsNewestFirst) {
    if (slot.durationMinutes !== null) {
      streakDays++;
    } else {
      break;
    }
  }

  return {
    avgMinutes,
    avgLabel,
    bestDate: bestSlot.date,
    bestLabel: bestSlot.durationLabel,
    streakDays,
  };
}
