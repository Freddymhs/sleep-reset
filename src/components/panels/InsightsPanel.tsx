/**
 * InsightsPanel — esfuerzo/contexto ↔ hora de despertar (correlación N=1).
 *
 * Honesty guardrails (see insights.ts §7):
 *   - Operates on COLLAPSED NIGHTS (no double-count of fragmented nights).
 *   - Gate by nights-with-context: < POINTS → empty state; POINTS–TREND →
 *     points + keep-logging; ≥ TREND → points + trend + N-of-1 disclaimer.
 *   - Strip plot with deterministic jitter (no regression line). Earlier wake
 *     = lower = better. Findings are ASSOCIATION, never cause.
 */

import { useEffect, useMemo, useState } from "react";
import { getRecentLogs } from "../../hooks/useSleepLog";
import { getRecentContext } from "../../hooks/useDayContext";
import {
  collapseNights,
  effortBreakdown,
  energyBreakdown,
  activityBreakdown,
  tensionBreakdown,
  dosesBreakdown,
  buildCrossInsight,
  type NightRow,
} from "../../lib/insights";
import { fromNightMinutes } from "../../lib/sleep";
import {
  ENERGY_STATE_META,
  MENTAL_EFFORT_META,
  PHYSICAL_ACTIVITY_META,
  SOMATIC_TENSION_META,
  WAKE_RANGE,
  INSIGHTS_MIN_NIGHTS_POINTS,
  INSIGHTS_MIN_NIGHTS_TREND,
} from "../../lib/constants";
import type { MentalEffort } from "../../lib/types";

/** How far back to look — wide enough to accumulate the trend threshold. */
const INSIGHTS_FETCH_DAYS = 60 as const;

/** Night-minutes of a "HH:MM" wake-range bound (hours < 12 are post-midnight). */
function boundToNightMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h < 12 ? h * 60 + m + 1440 : h * 60 + m;
}

const WAKE_FROM_MIN = boundToNightMinutes(WAKE_RANGE.from);
const WAKE_TO_MIN = boundToNightMinutes(WAKE_RANGE.to);

const EFFORT_COLUMNS: readonly MentalEffort[] = ["light", "moderate", "heavy"] as const;

/** Dot size class by melatonin dose count (more doses = bigger). */
function dotSizeClass(doses: number): string {
  if (doses >= 3) return "w-3.5 h-3.5";
  if (doses === 2) return "w-3 h-3";
  return "w-2 h-2";
}

export function InsightsPanel() {
  const [nights, setNights] = useState<NightRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [logs, contexts] = await Promise.all([
          getRecentLogs(INSIGHTS_FETCH_DAYS),
          getRecentContext(INSIGHTS_FETCH_DAYS),
        ]);
        setNights(collapseNights(logs, contexts));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando insights");
      }
    };
    void load();
  }, []);

  const nightsWithCtx = useMemo(
    () => (nights ?? []).filter((n) => n.ctx !== undefined),
    [nights],
  );

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-sm text-red-400 text-center">{error}</p>
      </div>
    );
  }

  if (nights === null) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-xs text-gray-500">Cargando…</p>
      </div>
    );
  }

  // Gate 1: not enough nights with context → empty state only.
  if (nightsWithCtx.length < INSIGHTS_MIN_NIGHTS_POINTS) {
    const missing = INSIGHTS_MIN_NIGHTS_POINTS - nightsWithCtx.length;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <span className="text-3xl">🔭</span>
        <p className="text-sm text-gray-300 font-medium">Aún sin patrones</p>
        <p className="text-xs text-gray-500">
          Registrá el contexto de tus días al marcar “Voy a dormir”. Faltan{" "}
          {missing} {missing === 1 ? "noche" : "noches"} para empezar a ver el cruce.
        </p>
      </div>
    );
  }

  const showTrend = nightsWithCtx.length >= INSIGHTS_MIN_NIGHTS_TREND;
  const insightText = buildCrossInsight(nights);

  return (
    <div className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto">
      <ScatterCard nights={nightsWithCtx} />
      <BreakdownsCard nights={nights} />

      <div className="bg-gray-800 rounded-2xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">El cruce</p>
        <p className="text-sm text-gray-200">{insightText}</p>
        {showTrend && (
          <p className="text-[10px] text-gray-500 mt-2 leading-snug">
            ⚠️ Datos de una sola persona (N=1): esto es una asociación, no una causa.
            Patrones de pocos días pueden ser ruido — tomalo como pista, no como regla.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Scatter (strip plot) ──────────────────────────────────────────────────────

function ScatterCard({ nights }: { nights: NightRow[] }) {
  const plotted = nights.filter((n) => n.ctx?.mental_effort != null);

  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
        Esfuerzo ↔ hora de despertar
      </p>
      <p className="text-[10px] text-gray-600 mb-3">
        Más abajo = despertar más temprano (mejor). Color = estado mental, tamaño = dosis.
      </p>

      <div className="flex">
        {/* Y axis labels */}
        <div className="flex flex-col justify-between text-[9px] text-gray-600 pr-1 h-32 shrink-0">
          <span>{WAKE_RANGE.to}+</span>
          <span>{WAKE_RANGE.from}</span>
        </div>

        {/* columns */}
        <div className="flex-1 flex">
          {EFFORT_COLUMNS.map((effort) => {
            const colPoints = plotted.filter((n) => n.ctx?.mental_effort === effort);
            return (
              <div key={effort} className="flex-1 flex flex-col items-center">
                <div className="relative w-full h-32 border-l border-gray-700/50">
                  {colPoints.map((n, i) => {
                    const span = WAKE_TO_MIN - WAKE_FROM_MIN;
                    const ratio = Math.min(1, Math.max(0, (n.wakeMinutes - WAKE_FROM_MIN) / span));
                    const bottomPercent = ratio * 100;
                    // Deterministic horizontal jitter — spread points in the column
                    // without Math.random (react-hooks/purity).
                    const jitter = 20 + ((i * 37) % 60);
                    const colorClass = n.ctx?.energy_state
                      ? ENERGY_STATE_META[n.ctx.energy_state].color
                      : "bg-gray-500";
                    return (
                      <span
                        key={n.date}
                        className={`absolute rounded-full ${colorClass} ${dotSizeClass(n.melatoninDoses)} -translate-x-1/2 -translate-y-1/2`}
                        style={{ left: `${jitter}%`, bottom: `${bottomPercent}%` }}
                        title={`${n.date} · ${fromNightMinutes(n.wakeMinutes)} · ${n.melatoninDoses} dosis`}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-gray-400 mt-1">
                  {MENTAL_EFFORT_META[effort].label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Breakdown cards ───────────────────────────────────────────────────────────

function BreakdownsCard({ nights }: { nights: NightRow[] }) {
  const effort = effortBreakdown(nights);
  const energy = energyBreakdown(nights);
  const activity = activityBreakdown(nights);
  const tension = tensionBreakdown(nights);
  const doses = dosesBreakdown(nights);

  return (
    <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide">
        Hora media de despertar
      </p>

      <BreakdownRow title="Esfuerzo" entries={Object.entries(effort).map(([k, v]) => ({
        label: MENTAL_EFFORT_META[k as keyof typeof MENTAL_EFFORT_META].label,
        emoji: MENTAL_EFFORT_META[k as keyof typeof MENTAL_EFFORT_META].emoji,
        value: v,
      }))} />
      <BreakdownRow title="Mente" entries={Object.entries(energy).map(([k, v]) => ({
        label: ENERGY_STATE_META[k as keyof typeof ENERGY_STATE_META].label,
        emoji: ENERGY_STATE_META[k as keyof typeof ENERGY_STATE_META].emoji,
        value: v,
      }))} />
      <BreakdownRow title="Actividad" entries={Object.entries(activity).map(([k, v]) => ({
        label: PHYSICAL_ACTIVITY_META[k as keyof typeof PHYSICAL_ACTIVITY_META].label,
        emoji: PHYSICAL_ACTIVITY_META[k as keyof typeof PHYSICAL_ACTIVITY_META].emoji,
        value: v,
      }))} />
      <BreakdownRow title="Cuerpo" entries={Object.entries(tension).map(([k, v]) => ({
        label: SOMATIC_TENSION_META[k as keyof typeof SOMATIC_TENSION_META].label,
        emoji: SOMATIC_TENSION_META[k as keyof typeof SOMATIC_TENSION_META].emoji,
        value: v,
      }))} />
      <BreakdownRow title="Dosis" entries={(Object.entries(doses) as [string, number | null][]).map(([k, v]) => ({
        label: `${k}×`,
        emoji: "💊",
        value: v,
      }))} />
    </div>
  );
}

interface BreakdownEntry {
  label: string;
  emoji: string;
  value: number | null;
}

function BreakdownRow({ title, entries }: { title: string; entries: BreakdownEntry[] }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 mb-1">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {entries.map((e) => (
          <span
            key={e.label}
            className={`px-2 py-0.5 rounded-md text-[11px] ${
              e.value === null ? "bg-gray-900 text-gray-600" : "bg-gray-700 text-gray-200"
            }`}
          >
            {e.emoji} {e.label}: {e.value === null ? "—" : fromNightMinutes(e.value)}
          </span>
        ))}
      </div>
    </div>
  );
}
