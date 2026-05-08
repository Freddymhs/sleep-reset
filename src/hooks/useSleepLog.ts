/**
 * useSleepLog — CRUD operations on the `sleep_logs` table in Supabase.
 *
 * All functions throw on error — callers must handle with try/catch.
 * user_id is resolved internally via supabase.auth.getUser().
 */

import { supabase } from "../lib/supabase";
import { DB_TABLES } from "../lib/constants";
import type { SleepLog } from "../lib/types";

const SLEEP_LOGS_TABLE = DB_TABLES.SLEEP_LOGS;

/**
 * Active sessions older than this are ignored — most likely an abandoned log.
 * Forcing the user to start fresh prevents stale-state confusion.
 */
const ACTIVE_SESSION_MAX_AGE_HOURS = 36 as const;

/**
 * Returns today's date in ISO 8601 format (YYYY-MM-DD) using local timezone.
 */
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Resolves the current authenticated user's ID.
 * Throws if the user is not authenticated.
 */
async function resolveUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("User not authenticated");
  return data.user.id;
}

/**
 * Logs bedtime as a fresh session.
 * Multiple sessions per date are allowed (DSPD recovery often involves
 * fragmented sleep — premature wake + retry the same night).
 *
 * @returns The newly inserted SleepLog row.
 */
export async function logBedtime(): Promise<SleepLog> {
  const userId = await resolveUserId();
  const today = getTodayDate();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .insert({
      user_id: userId,
      date: today,
      bedtime: now,
      source: "manual",
    })
    .select()
    .single();

  if (error) throw error;
  return data as SleepLog;
}

/**
 * Returns the active session: a log with bedtime but no wake_time yet,
 * regardless of date — but only if it's recent (< ACTIVE_SESSION_MAX_AGE_HOURS).
 * Stale sessions (e.g., user abandoned the app for days) are ignored so the
 * UI doesn't show confusing old state.
 */
export async function getActiveLog(): Promise<SleepLog | null> {
  const userId = await resolveUserId();

  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .not("bedtime", "is", null)
    .is("wake_time", null)
    .order("bedtime", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const log = data as SleepLog;
  if (log.bedtime === null) return null;

  const ageHours = (Date.now() - new Date(log.bedtime).getTime()) / 3_600_000;
  if (ageHours > ACTIVE_SESSION_MAX_AGE_HOURS) return null;

  return log;
}

/**
 * Updates wake_time on the active session with the given quality flag.
 * 'normal' = expected wake. 'premature' = woke too early, couldn't fall back asleep.
 */
async function completeActiveSession(quality: "normal" | "premature"): Promise<SleepLog> {
  const active = await getActiveLog();
  if (!active) throw new Error("No hay registro de bedtime pendiente");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .update({ wake_time: now, quality })
    .eq("id", active.id)
    .select()
    .single();

  if (error) throw error;
  return data as SleepLog;
}

/**
 * Logs a normal wake time on the active session.
 * Handles cross-midnight: bedtime at 11pm (yesterday), wake at 9am (today).
 */
export async function logWakeTime(): Promise<SleepLog> {
  return completeActiveSession("normal");
}

/**
 * Logs a premature wake — the user woke too early and couldn't fall back asleep.
 * Same as logWakeTime but flags the log with quality='premature' for history visualization.
 */
export async function logPrematureWake(): Promise<SleepLog> {
  return completeActiveSession("premature");
}

/**
 * Registers a complete past sleep session (both bedtime and wake_time at once).
 * Use when the user collapsed without logging — common in DSPD recovery.
 *
 * Both inputs are local "HH:MM" strings for today. The function builds the
 * appropriate ISO timestamps assuming bedtime was today (or yesterday if
 * the bedtime hour is greater than the wake hour, indicating cross-midnight).
 */
export async function logManualSession(
  bedtimeHHMM: string,
  wakeTimeHHMM: string,
): Promise<SleepLog> {
  const userId = await resolveUserId();
  const today = new Date();
  const [bH, bM] = bedtimeHHMM.split(":").map(Number);
  const [wH, wM] = wakeTimeHHMM.split(":").map(Number);

  // Wake time is always today; bedtime is yesterday if it's later in the
  // wall clock than the wake (e.g. bedtime 23:00, wake 09:00).
  const wake = new Date(today);
  wake.setHours(wH, wM, 0, 0);

  const bed = new Date(today);
  bed.setHours(bH, bM, 0, 0);
  if (bed.getTime() > wake.getTime()) {
    bed.setDate(bed.getDate() - 1);
  }

  const dateForRow = `${bed.getFullYear()}-${(bed.getMonth() + 1).toString().padStart(2, "0")}-${bed.getDate().toString().padStart(2, "0")}`;

  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .insert({
      user_id: userId,
      date: dateForRow,
      bedtime: bed.toISOString(),
      wake_time: wake.toISOString(),
      source: "manual",
    })
    .select()
    .single();

  if (error) throw error;
  return data as SleepLog;
}

/**
 * Cancels the active session by deleting it entirely.
 * Use when the user marked "Voy a dormir" by mistake or never actually slept.
 */
export async function cancelActiveLog(): Promise<void> {
  const active = await getActiveLog();
  if (!active) return;

  const { error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .delete()
    .eq("id", active.id);

  if (error) throw error;
}

/**
 * Retrieves the most recent N sleep logs for the authenticated user,
 * ordered by date descending.
 *
 * @param days - Number of days to look back.
 * @returns Array of SleepLog rows (may be empty).
 */
export async function getRecentLogs(days: number): Promise<SleepLog[]> {
  const userId = await resolveUserId();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .gte("date", cutoffStr)
    .order("date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SleepLog[];
}
