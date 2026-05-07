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
 * Logs wake time for today (updates existing record).
 * Throws if no bedtime record exists for today.
 *
 * @returns The updated SleepLog row.
 */
export async function logWakeTime(): Promise<SleepLog> {
  const userId = await resolveUserId();
  const today = getTodayDate();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .update({ wake_time: now })
    .eq("user_id", userId)
    .eq("date", today)
    .select()
    .single();

  if (error) throw error;
  return data as SleepLog;
}

/**
 * Retrieves today's sleep log for the authenticated user.
 *
 * @returns The SleepLog row for today, or null if none exists.
 */
export async function getTodayLog(): Promise<SleepLog | null> {
  const userId = await resolveUserId();
  const today = getTodayDate();

  const { data, error } = await supabase
    .from(SLEEP_LOGS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (error) throw error;
  return data as SleepLog | null;
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
