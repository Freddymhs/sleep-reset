/**
 * HomePanel — Today's sleep logging hub.
 *
 * Render order (per protocol spec):
 *   1. LightBanner    — morning light reminder (conditional)
 *   2. ProtocolCard   — 3-pillar nightly recommendation
 *   3. DailyStatus    — today's sleep summary
 *   4. SleepLogger    — bedtime / wake-time log buttons
 *
 * Data flow:
 *   - goal         → useSleepGoal (current week's wake anchor, targets)
 *   - recentLogs   → getRecentLogs (used to compute protocol recommendation)
 *   - todayLog     → getTodayLog   (used for DailyStatus and SleepLogger)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { SleepGoal, SleepLog } from "../../lib/types";
import { getTodayLog, logBedtime, logWakeTime, getRecentLogs } from "../../hooks/useSleepLog";
import { useSleepGoal } from "../../hooks/useSleepGoal";
import { calcBedtimeRecommendation } from "../../lib/sleep";
import { RECENT_LOGS_COUNT } from "../../lib/constants";
import { DailyStatus } from "../DailyStatus";
import { SleepLogger } from "../SleepLogger";
import { ProtocolCard } from "../ProtocolCard";
import { LightBanner } from "../LightBanner";

/** How many days back to fetch for the recent-logs average. */
const RECENT_LOGS_FETCH_DAYS = 7 as const;

export function HomePanel() {
  const { goal, loading: goalLoading } = useSleepGoal();

  const [todayLog, setTodayLog] = useState<SleepLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<SleepLog[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [now, setNow] = useState(() => new Date());

  // Update `now` every minute so LightBanner window stays accurate.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const [today, recent] = await Promise.all([
        getTodayLog(),
        getRecentLogs(RECENT_LOGS_FETCH_DAYS),
      ]);
      setTodayLog(today);
      setRecentLogs(recent);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Error al cargar registros");
    }
  }, []);

  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  const handleLogBedtime = useCallback(async () => {
    const updated = await logBedtime();
    setTodayLog(updated);
    // Refresh recent logs so the recommendation updates immediately.
    getRecentLogs(RECENT_LOGS_FETCH_DAYS).then(setRecentLogs).catch(() => {});
  }, []);

  const handleLogWakeTime = useCallback(async () => {
    const updated = await logWakeTime();
    setTodayLog(updated);
  }, []);

  // Derive the protocol recommendation from recent logs + goal.
  // Slice to RECENT_LOGS_COUNT since calcBedtimeRecommendation already does
  // this internally, but keeping it explicit here documents the intent.
  const recommendation = useMemo(() => {
    if (!goal || recentLogs.length === 0) return null;
    return calcBedtimeRecommendation(recentLogs.slice(0, RECENT_LOGS_COUNT), goal);
  }, [goal, recentLogs]);

  const isLoading = goalLoading && recentLogs.length === 0;

  return (
    <div className="flex-1 flex flex-col gap-4 px-4 py-6">
      {/* Header */}
      <h2 className="text-base font-semibold text-white text-center">Hoy</h2>

      {isLoading ? (
        <p className="text-xs text-gray-500 text-center">Cargando...</p>
      ) : (
        <>
          {/* 1. Morning light banner — shown only during the wake-anchor window */}
          {goal && <LightBanner goal={goal as SleepGoal} now={now} />}

          {/* 2. Protocol card — 3 pillars + bedtime recommendation */}
          <ProtocolCard recommendation={recommendation} goal={goal} />

          {/* 3. Daily status summary */}
          <div className="bg-gray-800 rounded-2xl p-4">
            {fetchError ? (
              <p className="text-xs text-red-400 text-center">{fetchError}</p>
            ) : (
              <DailyStatus log={todayLog} />
            )}
          </div>

          {/* 4. Log buttons */}
          <SleepLogger
            log={todayLog}
            onLogBedtime={handleLogBedtime}
            onLogWakeTime={handleLogWakeTime}
          />
        </>
      )}
    </div>
  );
}
