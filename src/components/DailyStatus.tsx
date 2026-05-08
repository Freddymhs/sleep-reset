/**
 * DailyStatus — Displays today's sleep status based on the current log.
 *
 * - null log         → "Aún no registraste nada hoy"
 * - bedtime only     → "Dormiste a las HH:MM · despertando..."
 * - bedtime + wake   → "Dormiste Xh YYm"
 */

import type { SleepLog } from "../lib/types";
import { formatTime, calcDuration } from "../lib/sleep";

interface DailyStatusProps {
  log: SleepLog | null;
}

export function DailyStatus({ log }: DailyStatusProps) {
  if (!log || (!log.bedtime && !log.wake_time)) {
    return (
      <p className="text-sm text-gray-400 text-center">Aún no registraste nada hoy</p>
    );
  }

  if (log.bedtime !== null && log.wake_time !== null) {
    const duration = calcDuration(log.bedtime, log.wake_time);
    const isPremature = log.quality === "premature";
    return (
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-1">
          {isPremature ? "Sueño interrumpido" : "Duración de sueño"}
        </p>
        <p className="text-2xl font-semibold text-white">{duration}</p>
        <p className="text-xs text-gray-500 mt-1">
          {formatTime(log.bedtime)} → {formatTime(log.wake_time)}
          {isPremature && " · 😞"}
        </p>
      </div>
    );
  }

  if (log.bedtime !== null) {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-300">
          Dormiste a las <span className="font-medium text-white">{formatTime(log.bedtime)}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">despertando...</p>
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-400 text-center">Aún no registraste nada hoy</p>
  );
}
