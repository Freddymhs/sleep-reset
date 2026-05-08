/**
 * ProtocolSetupForm — lets the user configure the 3-pillar sleep protocol.
 *
 * Sections:
 *  1. Final goal (Phase B) — target_wake_time, target_bedtime
 *  2. First achievable goal (Phase A) — phase_a_wake
 *  3. Melatonin — melatonin_enabled toggle + melatonin_dose_mg
 *
 * On first save: current_wake_anchor is initialized to phase_a_wake (handled
 * by useSleepGoal.saveGoal).
 */

import { useState, useEffect } from "react";
import type { SleepGoal } from "../lib/types";

const MELATONIN_DEFAULT_DOSE = 0.5 as const;
const MELATONIN_MIN_DOSE = 0.5 as const;
const MELATONIN_MAX_DOSE = 3 as const;
const MELATONIN_STEP = 0.5 as const;

type SavePayload = {
  target_wake_time: string;
  target_bedtime: string;
  phase_a_wake: string;
  melatonin_enabled: boolean;
  melatonin_dose_mg: number;
};

interface ProtocolSetupFormProps {
  goal: SleepGoal | null;
  onSave: (data: SavePayload) => Promise<void>;
}

export function ProtocolSetupForm({ goal, onSave }: ProtocolSetupFormProps) {
  const [targetWake, setTargetWake] = useState("06:00");
  const [targetBedtime, setTargetBedtime] = useState("22:00");
  const [phaseAWake, setPhaseAWake] = useState("09:00");
  const [melatoninEnabled, setMelatoninEnabled] = useState(true);
  const [melatoninDose, setMelatoninDose] = useState<number>(MELATONIN_DEFAULT_DOSE);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-populate fields when goal data loads
  useEffect(() => {
    if (!goal) return;
    // Postgres time columns are "HH:MM:SS" — we only need "HH:MM" for <input type="time">
    setTargetWake(goal.target_wake_time.slice(0, 5));
    setTargetBedtime(goal.target_bedtime.slice(0, 5));
    setPhaseAWake(goal.phase_a_wake.slice(0, 5));
    setMelatoninEnabled(goal.melatonin_enabled);
    setMelatoninDose(goal.melatonin_dose_mg);
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setErrorMsg(null);

    try {
      await onSave({
        target_wake_time: targetWake,
        target_bedtime: targetBedtime,
        phase_a_wake: phaseAWake,
        melatonin_enabled: melatoninEnabled,
        melatonin_dose_mg: melatoninEnabled ? melatoninDose : 0,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar el protocolo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Section 1: Final goal (Phase B) ── */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Tu meta final</h3>
        <p className="text-xs text-gray-500">
          El objetivo ideal al que llegaremos gradualmente.
        </p>

        <div className="space-y-2">
          <label className="block text-xs text-gray-600">
            Quiero despertar a las
            <input
              type="time"
              value={targetWake}
              onChange={(e) => setTargetWake(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>

          <label className="block text-xs text-gray-600">
            Quiero dormirme a las
            <input
              type="time"
              value={targetBedtime}
              onChange={(e) => setTargetBedtime(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
        </div>
      </section>

      {/* ── Section 2: First achievable goal (Phase A) ── */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Primera meta alcanzable</h3>
        <p className="text-xs text-gray-500">
          Empezamos aquí antes de ir a tu meta final.
        </p>

        <label className="block text-xs text-gray-600">
          Antes, con trabajo, me despertaba a las
          <input
            type="time"
            value={phaseAWake}
            onChange={(e) => setPhaseAWake(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
      </section>

      {/* ── Section 3: Melatonin ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Melatonina</h3>
          <button
            type="button"
            role="switch"
            aria-checked={melatoninEnabled}
            onClick={() => setMelatoninEnabled((prev) => !prev)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
              melatoninEnabled ? "bg-indigo-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                melatoninEnabled ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Se tomara ~5.5h antes de tu bedtime actual.
        </p>

        {melatoninEnabled && (
          <label className="block text-xs text-gray-600">
            Dosis (mg)
            <input
              type="number"
              value={melatoninDose}
              min={MELATONIN_MIN_DOSE}
              max={MELATONIN_MAX_DOSE}
              step={MELATONIN_STEP}
              onChange={(e) => setMelatoninDose(parseFloat(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
        )}
      </section>

      {/* ── Feedback ── */}
      {success && (
        <p className="text-xs text-green-600 font-medium">Protocolo guardado correctamente.</p>
      )}
      {errorMsg && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Guardando..." : "Guardar protocolo"}
      </button>
    </form>
  );
}
