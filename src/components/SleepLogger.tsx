/**
 * SleepLogger — Buttons to manage the active sleep session.
 *
 * - No active session     → "Voy a dormir"
 * - Active session        → "Me desperté" + "Despertar prematuro" + "Anular esta noche"
 * - Completed session     → shows summary, no buttons
 */

import { useState } from "react";
import type { SleepLog } from "../lib/types";
import { formatTime } from "../lib/sleep";

interface SleepLoggerProps {
  /** The active session: bedtime != null && wake_time == null. Null when no session. */
  activeLog: SleepLog | null;
  /** Today's completed log (both bedtime and wake_time set). Null when not yet completed. */
  completedTodayLog: SleepLog | null;
  onLogBedtime: () => Promise<void>;
  onLogWakeTime: () => Promise<void>;
  onLogPrematureWake: () => Promise<void>;
  onCancelActive: () => Promise<void>;
}

export function SleepLogger({
  activeLog,
  completedTodayLog,
  onLogBedtime,
  onLogWakeTime,
  onLogPrematureWake,
  onCancelActive,
}: SleepLoggerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = (action: () => Promise<void>, errLabel: string) => async () => {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : errLabel);
    } finally {
      setLoading(false);
    }
  };

  // State 1: completed log for today → show summary, no buttons
  if (completedTodayLog?.bedtime && completedTodayLog?.wake_time) {
    return (
      <div className="bg-gray-800 rounded-2xl p-4 text-center">
        <p className="text-xs text-gray-400">Sesión completada</p>
        <p className="text-sm text-white mt-1">
          {formatTime(completedTodayLog.bedtime)} → {formatTime(completedTodayLog.wake_time)}
          {completedTodayLog.quality === "premature" && " · 😞 prematura"}
        </p>
      </div>
    );
  }

  // State 2: active session → wake buttons + cancel link
  if (activeLog?.bedtime) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-gray-400 text-center">
          Dormiste a las {formatTime(activeLog.bedtime)}
        </p>

        <button
          onClick={wrap(onLogWakeTime, "Error al registrar wake time")}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white"
        >
          Me desperté ☀️
        </button>

        <button
          onClick={wrap(onLogPrematureWake, "Error al registrar despertar prematuro")}
          disabled={loading}
          className="w-full py-2 px-4 rounded-xl font-medium text-xs transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-gray-200 border border-gray-600"
        >
          Despertar prematuro 😞
        </button>

        <button
          onClick={wrap(onCancelActive, "Error al anular registro")}
          disabled={loading}
          className="text-xs text-gray-500 underline hover:text-gray-300 disabled:opacity-50"
        >
          Anular esta noche
        </button>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    );
  }

  // State 3: no session, no completion → bedtime button
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={wrap(onLogBedtime, "Error al registrar bedtime")}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white"
      >
        Voy a dormir 🌙
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
