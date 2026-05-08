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
 *   - goal            → useSleepGoal (current week's wake anchor, targets)
 *   - recentLogs      → getRecentLogs (used to compute protocol recommendation)
 *   - activeLog       → getActiveLog  (pending session — bedtime without wake_time)
 *   - completedToday  → derived from recentLogs (today's row when complete)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { SleepGoal, SleepLog } from "../../lib/types";
import {
  getActiveLog,
  logBedtime,
  logWakeTime,
  logPrematureWake,
  cancelActiveLog,
  getRecentLogs,
} from "../../hooks/useSleepLog";
import { useSleepGoal } from "../../hooks/useSleepGoal";
import { calcBedtimeRecommendation } from "../../lib/sleep";
import { RECENT_LOGS_COUNT } from "../../lib/constants";
import { DailyStatus } from "../DailyStatus";
import { SleepLogger } from "../SleepLogger";
import { ProtocolCard } from "../ProtocolCard";
import { LightBanner } from "../LightBanner";

/** How many days back to fetch for the recent-logs average. */
const RECENT_LOGS_FETCH_DAYS = 7 as const;

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function HomePanel() {
  const { goal, loading: goalLoading } = useSleepGoal();

  const [activeLog, setActiveLog] = useState<SleepLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<SleepLog[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const [active, recent] = await Promise.all([
        getActiveLog(),
        getRecentLogs(RECENT_LOGS_FETCH_DAYS),
      ]);
      setActiveLog(active);
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
    await logBedtime();
    await refreshLogs();
  }, [refreshLogs]);

  const handleLogWakeTime = useCallback(async () => {
    await logWakeTime();
    await refreshLogs();
  }, [refreshLogs]);

  const handleLogPrematureWake = useCallback(async () => {
    await logPrematureWake();
    await refreshLogs();
  }, [refreshLogs]);

  const handleCancelActive = useCallback(async () => {
    await cancelActiveLog();
    await refreshLogs();
  }, [refreshLogs]);

  // Today's completed log (if any) — for the Sleep Logger summary state.
  const completedTodayLog = useMemo(() => {
    const today = getTodayDate();
    return recentLogs.find(
      (l) => l.date === today && l.bedtime !== null && l.wake_time !== null,
    ) ?? null;
  }, [recentLogs]);

  const recommendation = useMemo(() => {
    if (!goal || recentLogs.length === 0) return null;
    return calcBedtimeRecommendation(recentLogs.slice(0, RECENT_LOGS_COUNT), goal);
  }, [goal, recentLogs]);

  const isLoading = goalLoading && recentLogs.length === 0;

  // Status log for DailyStatus: prefer active session, then today's completed log.
  const statusLog = activeLog ?? completedTodayLog;

  return (
    <div className="flex-1 flex flex-col gap-4 px-4 py-6">
      <h2 className="text-base font-semibold text-white text-center">Hoy</h2>

      {isLoading ? (
        <p className="text-xs text-gray-500 text-center">Cargando...</p>
      ) : (
        <>
          {goal && <LightBanner goal={goal as SleepGoal} now={now} />}

          <ProtocolCard
            recommendation={recommendation}
            goal={goal}
            hasLogs={recentLogs.length > 0}
          />

          <div className="bg-gray-800 rounded-2xl p-4">
            {fetchError ? (
              <p className="text-xs text-red-400 text-center">{fetchError}</p>
            ) : (
              <DailyStatus log={statusLog} />
            )}
          </div>

          <SleepLogger
            activeLog={activeLog}
            completedTodayLog={completedTodayLog}
            onLogBedtime={handleLogBedtime}
            onLogWakeTime={handleLogWakeTime}
            onLogPrematureWake={handleLogPrematureWake}
            onCancelActive={handleCancelActive}
          />
        </>
      )}
    </div>
  );
}
