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
import type { DayContext, SleepGoal, SleepLog } from "../../lib/types";
import {
  getActiveLog,
  logBedtime,
  logWakeTime,
  logPrematureWake,
  cancelActiveLog,
  logManualSession,
  getRecentLogs,
  setMelatoninDoses,
} from "../../hooks/useSleepLog";
import {
  getDayContext,
  upsertDayContext,
  type DayContextInput,
} from "../../hooks/useDayContext";
import { useSleepGoal } from "../../hooks/useSleepGoal";
import { useStorage } from "../../hooks/useStorage";
import { calcBedtimeRecommendation } from "../../lib/sleep";
import {
  RECENT_LOGS_COUNT,
  STORAGE_KEYS,
  PREMATURE_TIP_WINDOW_HOURS,
  PREMATURE_STREAK_THRESHOLD,
} from "../../lib/constants";
import { COACHING_TIPS, isWithinHoursAgo } from "../../lib/coaching";
import type { CoachingTip } from "../../lib/coaching";
import { DailyStatus } from "../DailyStatus";
import { SleepLogger } from "../SleepLogger";
import { ProtocolCard } from "../ProtocolCard";
import { LightBanner } from "../LightBanner";
import { CoachingCard } from "../CoachingCard";

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
  const [dayContext, setDayContext] = useState<DayContext | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [firstSetupDismissed, setFirstSetupDismissed] = useStorage<boolean>(
    STORAGE_KEYS.COACHING_FIRST_SETUP_DISMISSED,
    false,
  );
  const [phaseAdvancePending, setPhaseAdvancePending] = useStorage<boolean>(
    STORAGE_KEYS.COACHING_PHASE_ADVANCE_PENDING,
    false,
  );

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const [active, recent, context] = await Promise.all([
        getActiveLog(),
        getRecentLogs(RECENT_LOGS_FETCH_DAYS),
        getDayContext(),
      ]);
      setActiveLog(active);
      setRecentLogs(recent);
      setDayContext(context);
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

  const handleLogManualSession = useCallback(
    async (bedtimeHHMM: string, wakeTimeHHMM: string) => {
      await logManualSession(bedtimeHHMM, wakeTimeHHMM);
      await refreshLogs();
    },
    [refreshLogs],
  );

  const handleUpsertDayContext = useCallback(async (input: DayContextInput) => {
    const updated = await upsertDayContext(input);
    setDayContext(updated);
  }, []);

  const handleSetMelatoninDoses = useCallback(
    async (n: number) => {
      if (!activeLog) return;
      const updated = await setMelatoninDoses(activeLog.id, n);
      setActiveLog(updated);
    },
    [activeLog],
  );

  // Today's most recent completed log — there may be multiple sessions
  // per day after the constraint was relaxed (premature + retry pattern).
  const completedTodayLog = useMemo(() => {
    const today = getTodayDate();
    return (
      recentLogs
        .filter((l) => l.date === today && l.bedtime !== null && l.wake_time !== null)
        .sort((a, b) => (b.bedtime ?? "").localeCompare(a.bedtime ?? ""))[0] ?? null
    );
  }, [recentLogs]);

  const recommendation = useMemo(() => {
    if (!goal || recentLogs.length === 0) return null;
    return calcBedtimeRecommendation(recentLogs.slice(0, RECENT_LOGS_COUNT), goal);
  }, [goal, recentLogs]);

  const isLoading = goalLoading && recentLogs.length === 0;

  // Status log for DailyStatus: prefer active session, then today's completed log.
  const statusLog = activeLog ?? completedTodayLog;

  // Coaching tip selection — priority order, only one at a time.
  const activeTip: CoachingTip | null = useMemo(() => {
    // 1. Active session in progress → tips for falling asleep (most contextual)
    if (activeLog) {
      return COACHING_TIPS.bedtime_struggle;
    }
    // 2. Premature wake just happened (most urgent post-event advice)
    const lastLog = recentLogs[0];
    if (
      lastLog?.quality === "premature" &&
      isWithinHoursAgo(lastLog.wake_time, PREMATURE_TIP_WINDOW_HOURS)
    ) {
      return COACHING_TIPS.premature_wake;
    }
    // 3. Phase advance happened (Monday) — set by useSleepGoal
    if (phaseAdvancePending) {
      return COACHING_TIPS.phase_advance;
    }
    // 4. Pattern: 3+ premature in last 7 days
    const prematureCount = recentLogs.filter((l) => l.quality === "premature").length;
    if (prematureCount >= PREMATURE_STREAK_THRESHOLD) {
      return COACHING_TIPS.streak_break;
    }
    // 5. First setup — only if goal exists and not yet dismissed
    if (goal && !firstSetupDismissed) {
      return COACHING_TIPS.first_setup;
    }
    return null;
  }, [activeLog, recentLogs, goal, firstSetupDismissed, phaseAdvancePending]);

  const dismissTip = useCallback((tipId: string) => {
    if (tipId === "first_setup") setFirstSetupDismissed(true);
    if (tipId === "phase_advance") setPhaseAdvancePending(false);
    // premature_wake and streak_break auto-expire by data — no manual dismiss
  }, [setFirstSetupDismissed, setPhaseAdvancePending]);

  return (
    <div className="flex-1 flex flex-col gap-4 px-4 py-6">
      <h2 className="text-base font-semibold text-white text-center">Hoy</h2>

      {isLoading ? (
        <p className="text-xs text-gray-500 text-center">Cargando...</p>
      ) : (
        <>
          {goal && <LightBanner goal={goal as SleepGoal} now={now} />}

          {activeTip && (
            <CoachingCard
              tip={activeTip}
              onDismiss={
                activeTip.id === "first_setup" || activeTip.id === "phase_advance"
                  ? () => dismissTip(activeTip.id)
                  : undefined
              }
            />
          )}

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
            onLogBedtime={handleLogBedtime}
            onLogWakeTime={handleLogWakeTime}
            onLogPrematureWake={handleLogPrematureWake}
            onCancelActive={handleCancelActive}
            onLogManualSession={handleLogManualSession}
            dayContext={dayContext}
            onUpsertDayContext={handleUpsertDayContext}
            onSetMelatoninDoses={handleSetMelatoninDoses}
          />
        </>
      )}
    </div>
  );
}
