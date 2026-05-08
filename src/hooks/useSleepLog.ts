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
 * Logs bedtime for today.
 * - If no log exists for today → INSERT.
 * - If a log already exists → UPDATE bedtime only.
 *
 * @returns The upserted SleepLog row.
 */
export async function logBedtime(): Promise<SleepLog> {
  const userId = await resolveUserId();
  const today = getTodayDate();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .upsert(
      {
        user_id: userId,
        date: today,
        bedtime: now,
        source: "manual",
      },
      { onConflict: "user_id,date" },
    )
    .select()
    .single();

  if (error) throw error;
  return data as SleepLog;
}

/**
 * Returns the active session: a log with bedtime but no wake_time yet,
 * regardless of date. This is what determines if "Voy a dormir" or
 * "Me desperté/Despertar prematuro" should be shown.
 */
export async function getActiveLog(): Promise<SleepLog | null> {
  const userId = await resolveUserId();

  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .not("bedtime", "is", null)
    .is("wake_time", null)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as SleepLog | null;
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
