/**
 * SleepLogger — Buttons to log bedtime and wake time for today.
 *
 * - "Voy a dormir" → logBedtime(); disabled once bedtime is logged.
 * - "Me desperté"  → logWakeTime(); disabled until bedtime logged or if wake logged.
 * - Both disabled during any in-flight operation.
 * - Error is shown inline below the buttons.
 */

import { useState } from "react";
import type { SleepLog } from "../lib/types";
import { formatTime } from "../lib/sleep";

interface SleepLoggerProps {
  log: SleepLog | null;
  onLogBedtime: () => Promise<void>;
  onLogWakeTime: () => Promise<void>;
}

export function SleepLogger({ log, onLogBedtime, onLogWakeTime }: SleepLoggerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBedtime = log?.bedtime != null;
  const hasWakeTime = log?.wake_time != null;

  const handleBedtime = async () => {
    setLoading(true);
    setError(null);
    try {
      await onLogBedtime();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar bedtime");
    } finally {
      setLoading(false);
    }
  };

  const handleWakeTime = async () => {
    setLoading(true);
    setError(null);
    try {
      await onLogWakeTime();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar wake time");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Bedtime button */}
      <button
        onClick={handleBedtime}
        disabled={loading || hasBedtime}
        className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white"
      >
        {hasBedtime && log?.bedtime
          ? `Dormiste a las ${formatTime(log.bedtime)}`
          : "Voy a dormir 🌙"}
      </button>

      {/* Wake time button */}
      <button
        onClick={handleWakeTime}
        disabled={loading || !hasBedtime || hasWakeTime}
        className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white"
      >
        {hasWakeTime && log?.wake_time
          ? `Despertaste a las ${formatTime(log.wake_time)}`
          : "Me desperté ☀️"}
      </button>

      {/* Inline error */}
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
