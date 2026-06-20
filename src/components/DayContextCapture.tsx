/**
 * DayContextCapture — low-friction chips to log the day's upstream signals,
 * shown during the active sleep session (right after "Voy a dormir").
 *
 * Fully skippable: nothing is created until the user taps a chip. Single-select
 * per row; tapping the selected chip again clears it. Melatonin doses reflect
 * the user's real protocol (1–3) and are descriptive, not normative.
 */

import { useState } from "react";
import {
  ENERGY_STATE_META,
  MELATONIN_DOSES_RANGE,
  MENTAL_EFFORT_META,
  PHYSICAL_ACTIVITY_META,
  SOMATIC_TENSION_META,
} from "../lib/constants";
import type { DayContext } from "../lib/types";
import type { DayContextInput } from "../hooks/useDayContext";

interface DayContextCaptureProps {
  /** Current saved context for today, or null if none yet. */
  value: DayContext | null;
  /** Melatonin doses already recorded on the active session (1–3). */
  doses: number;
  /** Upsert the day context with the merged selection. */
  onChange: (input: DayContextInput) => Promise<void>;
  /** Set melatonin doses on the active session. */
  onSetDoses: (n: number) => Promise<void>;
}

/** One single-select row of chips backed by a label/color/emoji meta map. */
function ChipRow<K extends string>({
  label,
  meta,
  selected,
  onSelect,
}: {
  label: string;
  meta: Record<K, { label: string; color: string; emoji: string }>;
  selected: K | null;
  onSelect: (value: K | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(meta) as K[]).map((key) => {
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(isSelected ? null : key)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                isSelected
                  ? `${meta[key].color} text-white`
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {meta[key].emoji} {meta[key].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DayContextCapture({ value, doses, onChange, onSetDoses }: DayContextCaptureProps) {
  const [effort, setEffort] = useState(value?.mental_effort ?? null);
  const [energy, setEnergy] = useState(value?.energy_state ?? null);
  const [activity, setActivity] = useState(value?.physical_activity ?? null);
  const [tension, setTension] = useState(value?.somatic_tension ?? null);
  const [error, setError] = useState<string | null>(null);

  const push = async (patch: Partial<DayContextInput>) => {
    setError(null);
    try {
      await onChange({
        mental_effort: effort,
        energy_state: energy,
        physical_activity: activity,
        somatic_tension: tension,
        ...patch,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar contexto");
    }
  };

  const setDoses = async (n: number) => {
    setError(null);
    try {
      await onSetDoses(n);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar dosis");
    }
  };

  const doseOptions = Array.from(
    { length: MELATONIN_DOSES_RANGE.max - MELATONIN_DOSES_RANGE.min + 1 },
    (_, i) => MELATONIN_DOSES_RANGE.min + i,
  );

  return (
    <div className="bg-gray-800/60 rounded-xl p-3 space-y-2 border border-gray-700">
      <p className="text-[11px] text-gray-400 text-center">¿Cómo estuvo tu día? (opcional)</p>

      <ChipRow
        label="Esfuerzo"
        meta={MENTAL_EFFORT_META}
        selected={effort}
        onSelect={(v) => {
          setEffort(v);
          void push({ mental_effort: v });
        }}
      />
      <ChipRow
        label="Mente"
        meta={ENERGY_STATE_META}
        selected={energy}
        onSelect={(v) => {
          setEnergy(v);
          void push({ energy_state: v });
        }}
      />
      <ChipRow
        label="Actividad"
        meta={PHYSICAL_ACTIVITY_META}
        selected={activity}
        onSelect={(v) => {
          setActivity(v);
          void push({ physical_activity: v });
        }}
      />
      <ChipRow
        label="Cuerpo"
        meta={SOMATIC_TENSION_META}
        selected={tension}
        onSelect={(v) => {
          setTension(v);
          void push({ somatic_tension: v });
        }}
      />

      <div className="flex items-center gap-2 pt-1 border-t border-gray-700">
        <span className="text-[10px] text-gray-500 w-16 shrink-0">Melatonina</span>
        <div className="flex gap-1">
          {doseOptions.map((n) => (
            <button
              key={n}
              onClick={() => void setDoses(n)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                doses === n
                  ? "bg-violet-500 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {n}
            </button>
          ))}
          <span className="text-[10px] text-gray-600 self-center ml-1">dosis</span>
        </div>
      </div>

      {error && <p className="text-[10px] text-red-400 text-center">{error}</p>}
    </div>
  );
}
