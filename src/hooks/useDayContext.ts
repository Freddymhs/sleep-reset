/**
 * useDayContext — CRUD on the `day_context` table in Supabase.
 *
 * One row per day (upsert by user_id + date). Captures the upstream day
 * signals (mental effort, energy state, physical activity, somatic tension)
 * correlated against wake quality in the insights panel.
 *
 * All functions throw on error — callers must handle with try/catch.
 * user_id is resolved internally via supabase.auth.getUser().
 */

import { supabase } from "../lib/supabase";
import { DB_TABLES } from "../lib/constants";
import type { DayContext, ISODate } from "../lib/types";

const DAY_CONTEXT_TABLE = DB_TABLES.DAY_CONTEXT;

/** Fields the user can capture (all optional/skippable). */
export interface DayContextInput {
  mental_effort?: DayContext["mental_effort"];
  energy_state?: DayContext["energy_state"];
  physical_activity?: DayContext["physical_activity"];
  somatic_tension?: DayContext["somatic_tension"];
  notes?: string | null;
}

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
 * Upserts the day context for a given date (defaults to today).
 * Idempotent by (user_id, date) — re-running with new fields edits the row.
 * updated_at is set explicitly here (no DB trigger).
 *
 * @returns The upserted DayContext row.
 */
export async function upsertDayContext(
  input: DayContextInput,
  date?: ISODate,
): Promise<DayContext> {
  const userId = await resolveUserId();
  const targetDate = date ?? getTodayDate();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(DAY_CONTEXT_TABLE)
    .upsert(
      {
        user_id: userId,
        date: targetDate,
        ...input,
        updated_at: now,
      },
      { onConflict: "user_id,date" },
    )
    .select()
    .single();

  if (error) throw error;
  return data as DayContext;
}

/**
 * Returns the day context for a given date (defaults to today), or null.
 */
export async function getDayContext(date?: ISODate): Promise<DayContext | null> {
  const userId = await resolveUserId();
  const targetDate = date ?? getTodayDate();

  const { data, error } = await supabase
    .from(DAY_CONTEXT_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("date", targetDate)
    .maybeSingle();

  if (error) throw error;
  return (data as DayContext) ?? null;
}

/**
 * Retrieves the most recent day-context rows, ordered by date descending.
 *
 * @param days - Number of days to look back.
 * @returns Array of DayContext rows (may be empty).
 */
export async function getRecentContext(days: number): Promise<DayContext[]> {
  const userId = await resolveUserId();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from(DAY_CONTEXT_TABLE)
    .select("*")
    .eq("user_id", userId)
    .gte("date", cutoffStr)
    .order("date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DayContext[];
}
