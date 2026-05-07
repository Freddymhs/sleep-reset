/**
 * SleepStats — Weekly aggregate stats card.
 *
 * Shows: average sleep duration, best day, and current streak.
 * Only complete logs (bedtime + wake_time) are counted toward averages.
 */

import type { WeekStats } from "../lib/sleep";

interface SleepStatsProps {
  stats: WeekStats;
}

interface StatCellProps {
  label: string;
  value: string;
  sub?: string;
}

function StatCell({ label, value, sub }: StatCellProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-lg font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
      <p className="text-xs text-gray-400 text-center">{label}</p>
    </div>
  );
}

const NO_DATA_LABEL = "—";

export function SleepStats({ stats }: SleepStatsProps) {
  const { avgLabel, bestLabel, streakDays } = stats;

  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">
        Esta semana
      </p>
      <div className="grid grid-cols-3 divide-x divide-gray-700">
        <StatCell
          label="Promedio"
          value={avgLabel ?? NO_DATA_LABEL}
        />
        <StatCell
          label="Mejor noche"
          value={bestLabel ?? NO_DATA_LABEL}
        />
        <StatCell
          label="Racha"
          value={streakDays > 0 ? `${streakDays}d` : NO_DATA_LABEL}
          sub={streakDays > 0 ? "seguidos" : undefined}
        />
      </div>
    </div>
  );
}
