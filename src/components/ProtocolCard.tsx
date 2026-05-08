/**
 * ProtocolCard — Displays the 3-pillar nightly protocol recommendation.
 *
 * Pillar 1: Suggested bedtime tonight (gradual shift toward goal)
 * Pillar 2: Melatonin time (avg bedtime - 5.5h), only if melatonin_enabled
 * Pillar 3: Wake anchor for this week
 *
 * Shows a goal-reached badge when phaseAComplete is true.
 */

import type { ProtocolRecommendation, SleepGoal } from "../lib/types";

interface ProtocolCardProps {
  recommendation: ProtocolRecommendation | null;
  goal: SleepGoal | null;
  /** True when there's at least 1 sleep log with bedtime in recent history. */
  hasLogs: boolean;
}

interface PillarRowProps {
  emoji: string;
  label: string;
  value: string;
}

function PillarRow({ emoji, label, value }: PillarRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-400">
        <span className="mr-2">{emoji}</span>
        {label}
      </span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

export function ProtocolCard({ recommendation, goal, hasLogs }: ProtocolCardProps) {
  if (!goal) {
    return (
      <div className="bg-gray-800 rounded-2xl p-4">
        <p className="text-sm text-gray-400 text-center">
          Configura el protocolo en Ajustes
        </p>
      </div>
    );
  }

  // Day 1 calibration: no historical bedtimes yet → can't compute the gradual shift.
  // Honest message instead of suggesting the absolute target (which would be too aggressive).
  if (!recommendation || !hasLogs) {
    return (
      <div className="bg-gray-800 rounded-2xl p-4">
        <p className="text-xs text-gray-500 text-center uppercase tracking-wide mb-3">
          Protocolo de esta noche
        </p>
        <p className="text-sm text-gray-300 text-center font-medium">
          Esta noche: dormite ~30 min antes de tu hora habitual
        </p>
        <p className="text-xs text-gray-500 text-center mt-2">
          La recomendación se ajustará después de 1-2 noches con datos reales.
          Forzar la meta directa fracasa por biología — el reloj se mueve gradualmente.
        </p>
      </div>
    );
  }

  const { suggestedBedtime, melatoninTime, wakeAnchor, phaseAComplete } = recommendation;

  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <p className="text-xs text-gray-500 text-center uppercase tracking-wide mb-1">
        Protocolo de esta noche
      </p>

      {phaseAComplete && (
        <p className="text-xs text-green-400 text-center font-medium mb-2">
          Fase A completada!
        </p>
      )}

      <div className="divide-y divide-gray-700">
        <PillarRow
          emoji="🌙"
          label="Esta noche dormite a las"
          value={suggestedBedtime}
        />

        {goal.melatonin_enabled && melatoninTime !== null && (
          <PillarRow
            emoji="💊"
            label={`Melatonina ${goal.melatonin_dose_mg}mg a las`}
            value={melatoninTime}
          />
        )}

        <PillarRow
          emoji="⏰"
          label="Wake anchor esta semana"
          value={wakeAnchor}
        />
      </div>
    </div>
  );
}
