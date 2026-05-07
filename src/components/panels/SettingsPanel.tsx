/**
 * SettingsPanel — account info, protocol setup, and protocol progress.
 *
 * Sections:
 *  1. Account — user email
 *  2. ProtocolSetupForm — configure the 3-pillar sleep protocol
 *  3. Protocol Progress — current wake anchor + progress bar toward target
 *  4. Sign-out button
 */

import { useAuth } from "../../hooks/useAuth";
import { useSleepGoal } from "../../hooks/useSleepGoal";
import { ProtocolSetupForm } from "../ProtocolSetupForm";

// ─── Progress bar helpers ──────────────────────────────────────────────────────

/**
 * Converts "HH:MM" or "HH:MM:SS" to total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Formats "HH:MM:SS" or "HH:MM" as a human-readable "HH:MM".
 */
function formatTime(time: string): string {
  return time.slice(0, 5);
}

/**
 * Computes progress percentage (0–100) for the wake anchor between
 * phase_a_wake and target_wake_time.
 *
 * Phase A wake > current_wake_anchor > target_wake_time (times decrease toward goal).
 * Progress = 0% at phase_a_wake, 100% at target_wake_time.
 */
function computeProgressPercent(
  phaseAWake: string,
  currentAnchor: string,
  targetWake: string,
): number {
  const phaseAMinutes = timeToMinutes(phaseAWake);
  const anchorMinutes = timeToMinutes(currentAnchor);
  const targetMinutes = timeToMinutes(targetWake);

  const totalRange = phaseAMinutes - targetMinutes;
  if (totalRange <= 0) return 100;

  const elapsed = phaseAMinutes - anchorMinutes;
  const clamped = Math.max(0, Math.min(elapsed, totalRange));
  return Math.round((clamped / totalRange) * 100);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SettingsPanel() {
  const { session, signOut } = useAuth();
  const { goal, loading, saveGoal } = useSleepGoal();

  const userEmail = session?.user.email ?? "";

  const progressPercent =
    goal !== null
      ? computeProgressPercent(
          goal.phase_a_wake,
          goal.current_wake_anchor,
          goal.target_wake_time,
        )
      : 0;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 py-4 gap-6">
      {/* ── Account ── */}
      <section className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
          {userEmail[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Cuenta</p>
          <p className="text-sm text-gray-800 truncate">{userEmail}</p>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* ── Protocol setup form ── */}
      {loading ? (
        <div className="flex justify-center py-6">
          <svg
            className="w-5 h-5 animate-spin text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : (
        <ProtocolSetupForm goal={goal} onSave={saveGoal} />
      )}

      {/* ── Protocol progress (only when goal exists) ── */}
      {goal !== null && (
        <>
          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Progreso del protocolo</h3>

            <p className="text-xs text-gray-600">
              Esta semana: despertar a las{" "}
              <span className="font-semibold text-indigo-600">
                {formatTime(goal.current_wake_anchor)}
              </span>
            </p>

            {/* Progress bar: phase_a_wake → target_wake_time */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Fase A — {formatTime(goal.phase_a_wake)}</span>
                <span>Meta — {formatTime(goal.target_wake_time)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-right text-xs text-gray-400">{progressPercent}% completado</p>
            </div>
          </section>
        </>
      )}

      {/* ── Sign out ── */}
      <div className="mt-auto pt-2">
        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors"
        >
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}
