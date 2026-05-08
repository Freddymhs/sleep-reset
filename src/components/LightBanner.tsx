/**
 * LightBanner — Morning light exposure reminder.
 *
 * Shown when the current time is within LIGHT_BANNER_WINDOW_MINUTES of the
 * current wake anchor. Dismissed per-day via chrome.storage.local so it does
 * not reappear once the user has confirmed light exposure.
 *
 * Storage key: light_done_<YYYY-MM-DD>
 */

import { useCallback } from "react";
import { useStorage } from "../hooks/useStorage";
import { shouldShowLightBanner } from "../lib/sleep";
import type { SleepGoal } from "../lib/types";

interface LightBannerProps {
  goal: SleepGoal;
  now: Date;
}

/** Returns today's date as YYYY-MM-DD in local timezone. */
function getTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = (d.getMonth() + 1).toString().padStart(2, "0");
  const da = d.getDate().toString().padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Formats a Date to a human-readable HH:MMam/pm string. */
function formatLocalTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes}${period}`;
}

export function LightBanner({ goal, now }: LightBannerProps) {
  const today = getTodayISO();
  const storageKey = `light_done_${today}`;

  const [isDone, setIsDone] = useStorage<boolean>(storageKey, false);

  const handleDone = useCallback(() => {
    setIsDone(true);
  }, [setIsDone]);

  const isWithinWindow = shouldShowLightBanner(goal, now);
  const shouldRender = isWithinWindow && !isDone;

  if (!shouldRender) return null;

  const timeDisplay = formatLocalTime(now);

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-start gap-3">
      <span className="text-2xl shrink-0" aria-hidden="true">☀️</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-yellow-300">
          Son las {timeDisplay} — luz matutina 15 min ahora
        </p>
        <ul className="mt-1.5 space-y-0.5 text-[11px] text-yellow-200/80">
          <li>• Ventana con luz directa, o</li>
          <li>• Lámpara 10,000 lux a ~50cm, o</li>
          <li>• Lugar más iluminado de la casa si está nublado</li>
        </ul>
        <button
          type="button"
          onClick={handleDone}
          className="mt-2 text-xs font-semibold text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors px-3 py-1 rounded-full"
        >
          Ya lo hice
        </button>
      </div>
    </div>
  );
}
