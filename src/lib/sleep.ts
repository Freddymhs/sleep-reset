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
import type { ISODatetime, ProtocolRecommendation, SleepGoal, SleepLog, TimeString } from "./types";

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
  const wrapped = nightMinutes % MINUTES_PER_DAY;
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
 * Returns true when the current time is within the morning light window —
 * i.e., at or before wake_anchor + LIGHT_BANNER_WINDOW_MINUTES.
 *
 * This tells the user to go get morning light exposure right now.
 */
export function shouldShowLightBanner(goal: SleepGoal, now: Date): boolean {
  const wakeAnchorMin = timeStringToMinutes(goal.current_wake_anchor);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin <= wakeAnchorMin + LIGHT_BANNER_WINDOW_MINUTES;
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
  const suggestedMin = avgBedtimeMin - shift;

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
