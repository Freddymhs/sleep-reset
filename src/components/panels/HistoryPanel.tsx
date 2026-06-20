/**
 * HistoryPanel — 7-day sleep history with chart and aggregate stats.
 *
 * Layout:
 *   SleepStats  (average, best day, streak)  — top
 *   SleepHistoryChart (7-bar chart)           — bottom
 *
 * Loading state shows skeleton bars while data is fetched.
 */

import { useEffect, useState } from "react";
import { getRecentLogs } from "../../hooks/useSleepLog";
import { getRecentContext } from "../../hooks/useDayContext";
import { buildDaySlots, calcWeekStats } from "../../lib/sleep";
import type { DaySlot, WeekStats } from "../../lib/sleep";
import { SleepHistoryChart } from "../SleepHistoryChart";
import { SleepStats } from "../SleepStats";

const HISTORY_DAYS = 7 as const;

function SkeletonBars() {
  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">
        Últimos 7 días
      </p>
      <div className="flex items-end gap-2">
        {Array.from({ length: HISTORY_DAYS }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className="w-full rounded-t-sm bg-gray-700 animate-pulse" style={{ height: "40px" }} />
            <div className="h-3 w-8 bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-6 bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">
        Esta semana
      </p>
      <div className="grid grid-cols-3 divide-x divide-gray-700">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 px-2">
            <div className="h-6 w-12 bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-14 bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HistoryPanel() {
  const [slots, setSlots] = useState<DaySlot[] | null>(null);
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [logs, contexts] = await Promise.all([
          getRecentLogs(HISTORY_DAYS),
          getRecentContext(HISTORY_DAYS),
        ]);
        const daySlots = buildDaySlots(logs, contexts);
        const weekStats = calcWeekStats(daySlots);
        setSlots(daySlots);
        setStats(weekStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando historial");
      }
    };

    void load();
  }, []);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-sm text-red-400 text-center">{error}</p>
      </div>
    );
  }

  const isLoading = slots === null || stats === null;

  return (
    <div className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto">
      {isLoading ? (
        <>
          <SkeletonStats />
          <SkeletonBars />
        </>
      ) : (
        <>
          <SleepStats stats={stats} />
          <SleepHistoryChart slots={slots} />
        </>
      )}
    </div>
  );
}
