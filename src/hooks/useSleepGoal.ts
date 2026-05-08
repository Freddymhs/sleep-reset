/**
 * useSleepGoal — CRUD + weekly anchor advance for the `sleep_goals` table.
 *
 * Responsibilities:
 *  - goal               → Active SleepGoal for the current user (null if none).
 *  - saveGoal(data)     → Upsert goal; sets current_wake_anchor = phase_a_wake on first save.
 *  - advanceWakeAnchor  → Called automatically on mount. Decrements current_wake_anchor
 *                         by WAKE_ANCHOR_ADVANCE_MINUTES every Monday, guarded by a
 *                         persisted date in chrome.storage.local to prevent double-advances.
 *
 * All async functions throw on error — callers must handle with try/catch.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { STORAGE_KEYS, WAKE_ANCHOR_ADVANCE_MINUTES, DB_TABLES } from "../lib/constants";
import type { SleepGoal, NewSleepGoal, UpdateSleepGoal, TimeString } from "../lib/types";

const SLEEP_GOALS_TABLE = DB_TABLES.SLEEP_GOALS;

// ─── Time utilities ────────────────────────────────────────────────────────────

/**
 * Parses a "HH:MM" or "HH:MM:SS" time string into total minutes since midnight.
 */
function timeToMinutes(time: TimeString): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts total minutes since midnight back to a "HH:MM" time string.
 * Wraps around at midnight (1440 minutes).
 */
function minutesToTime(totalMinutes: number): TimeString {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60).toString().padStart(2, "0");
  const m = (wrapped % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Returns true if the given date falls on a Monday (getDay() === 1).
 */
function isMonday(date: Date): boolean {
  return date.getDay() === 1;
}

/**
 * Returns today's ISO date string (YYYY-MM-DD) in local timezone.
 */
function getTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = (d.getMonth() + 1).toString().padStart(2, "0");
  const da = d.getDate().toString().padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

// ─── Data-access helpers ───────────────────────────────────────────────────────

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
 * Advances current_wake_anchor by WAKE_ANCHOR_ADVANCE_MINUTES toward
 * target_wake_time for the given goal and user.
 *
 * Returns the updated SleepGoal, or null if no advance was needed / performed.
 */
async function runAdvanceWakeAnchor(
  currentGoal: SleepGoal,
  userId: string,
): Promise<SleepGoal | null> {
  const today = new Date();
  if (!isMonday(today)) return null;

  const todayISO = getTodayISO();
  const storageKey = STORAGE_KEYS.LAST_ANCHOR_ADVANCE_DATE;

  const stored = await browser.storage.local.get(storageKey);
  const lastAdvance = stored[storageKey] as string | undefined;
  if (lastAdvance === todayISO) return null;

  const anchorMinutes = timeToMinutes(currentGoal.current_wake_anchor);
  const targetMinutes = timeToMinutes(currentGoal.target_wake_time);

  // Already at or earlier than target — no advance needed
  if (anchorMinutes <= targetMinutes) return null;

  const advancedMinutes = anchorMinutes - WAKE_ANCHOR_ADVANCE_MINUTES;
  const clampedMinutes = Math.max(advancedMinutes, targetMinutes);
  const newAnchor = minutesToTime(clampedMinutes);

  const now = new Date().toISOString();
  const payload: UpdateSleepGoal = {
    current_wake_anchor: newAnchor,
    updated_at: now,
  };

  const { data: updated, error } = await supabase
    .from(SLEEP_GOALS_TABLE)
    .update(payload)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;

  await browser.storage.local.set({ [storageKey]: todayISO });
  // Flag the phase_advance coaching tip so HomePanel can surface it.
  await browser.storage.local.set({
    [STORAGE_KEYS.COACHING_PHASE_ADVANCE_PENDING]: true,
  });
  return updated as SleepGoal;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface SleepGoalState {
  goal: SleepGoal | null;
  loading: boolean;
  saveGoal: (data: Omit<NewSleepGoal, "user_id" | "current_wake_anchor">) => Promise<void>;
  advanceWakeAnchor: () => Promise<void>;
}

export function useSleepGoal(): SleepGoalState {
  const [goal, setGoal] = useState<SleepGoal | null>(null);
  const [loading, setLoading] = useState(true);

  // Stable ref so advanceWakeAnchor can access the latest goal without being
  // re-created on every render.
  const goalRef = useRef<SleepGoal | null>(null);
  goalRef.current = goal;

  // ── Fetch goal on mount + auto-advance if it's Monday ───────────────────────
  useEffect(() => {
    let isMounted = true;

    const initGoal = async () => {
      try {
        const userId = await resolveUserId();

        const { data, error } = await supabase
          .from(SLEEP_GOALS_TABLE)
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;
        const fetched = data as SleepGoal | null;

        if (!isMounted) return;

        // Auto-advance on Mondays if a goal exists
        if (fetched) {
          try {
            const advanced = await runAdvanceWakeAnchor(fetched, userId);
            if (isMounted) setGoal(advanced ?? fetched);
          } catch {
            // Advance failing is non-fatal — show goal as-is
            if (isMounted) setGoal(fetched);
          }
        } else {
          setGoal(null);
        }
      } catch {
        // Auth or network error — keep goal as null
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initGoal();
    return () => { isMounted = false; };
  }, []);

  // ── saveGoal ─────────────────────────────────────────────────────────────────
  /**
   * Upserts the sleep goal.
   * On first save: current_wake_anchor is initialized to phase_a_wake.
   * On subsequent saves: current_wake_anchor is preserved from the existing goal.
   */
  const saveGoal = useCallback(
    async (data: Omit<NewSleepGoal, "user_id" | "current_wake_anchor">) => {
      const userId = await resolveUserId();
      const currentGoal = goalRef.current;
      const now = new Date().toISOString();

      if (currentGoal === null) {
        // First save — anchor starts at phase_a_wake
        const payload: NewSleepGoal = {
          user_id: userId,
          current_wake_anchor: data.phase_a_wake,
          ...data,
        };

        const { data: inserted, error } = await supabase
          .from(SLEEP_GOALS_TABLE)
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setGoal(inserted as SleepGoal);
      } else {
        // Subsequent save — preserve existing anchor
        const payload: UpdateSleepGoal = {
          ...data,
          current_wake_anchor: currentGoal.current_wake_anchor,
          updated_at: now,
        };

        const { data: updated, error } = await supabase
          .from(SLEEP_GOALS_TABLE)
          .update(payload)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        setGoal(updated as SleepGoal);
      }
    },
    [],
  );

  // ── advanceWakeAnchor (manual trigger) ───────────────────────────────────────
  /**
   * Exposed for manual calls (e.g. testing). The hook auto-advances on mount.
   */
  const advanceWakeAnchor = useCallback(async () => {
    const currentGoal = goalRef.current;
    if (!currentGoal) return;

    const userId = await resolveUserId();
    const advanced = await runAdvanceWakeAnchor(currentGoal, userId);
    if (advanced) setGoal(advanced);
  }, []);

  return { goal, loading, saveGoal, advanceWakeAnchor };
}
