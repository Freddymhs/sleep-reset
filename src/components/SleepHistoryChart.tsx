/**
 * SleepHistoryChart — 7-day sleep bar chart implemented with divs + Tailwind.
 *
 * Colour coding:
 *   green  ≥ 7h
 *   yellow 5–7h
 *   red    < 5h
 *   gray   no data
 *
 * Hover/tap shows bedtime and wake time as a tooltip.
 */

import { useState } from "react";
import type { DaySlot } from "../lib/sleep";
import { ENERGY_STATE_META, MENTAL_EFFORT_META } from "../lib/constants";

interface SleepHistoryChartProps {
  slots: DaySlot[];
}

const BAR_COLOR_CLASS: Record<DaySlot["color"], string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  gray: "bg-gray-700",
};

/** Max bar height corresponds to 10 hours of sleep. */
const MAX_DISPLAY_MINUTES = 10 * 60;

function barHeightPercent(durationMinutes: number | null): number {
  if (durationMinutes === null || durationMinutes === 0) return 4; // tiny stub to show the slot
  return Math.min(100, Math.round((durationMinutes / MAX_DISPLAY_MINUTES) * 100));
}

interface BarTooltipProps {
  slot: DaySlot;
}

function BarTooltip({ slot }: BarTooltipProps) {
  if (slot.durationMinutes === null) {
    return (
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 whitespace-nowrap z-10 shadow-lg">
        Sin datos
      </div>
    );
  }

  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 whitespace-nowrap z-10 shadow-lg">
      <p className="font-semibold text-white">{slot.durationLabel}</p>
      {slot.bedtimeLabel && (
        <p>
          <span className="text-gray-500">Dormir:</span> {slot.bedtimeLabel}
        </p>
      )}
      {slot.wakeTimeLabel && (
        <p>
          <span className="text-gray-500">Despertar:</span> {slot.wakeTimeLabel}
        </p>
      )}
    </div>
  );
}

interface DayBarProps {
  slot: DaySlot;
}

function DayBar({ slot }: DayBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const heightPercent = barHeightPercent(slot.durationMinutes);
  const colorClass = BAR_COLOR_CLASS[slot.color];

  return (
    <div className="flex flex-col items-center gap-1 flex-1 relative">
      {/* chart area */}
      <div
        className="relative w-full flex flex-col justify-end cursor-pointer"
        style={{ height: "80px" }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip((prev) => !prev)}
        aria-label={`${slot.label}: ${slot.durationLabel ?? "sin datos"}`}
      >
        {showTooltip && <BarTooltip slot={slot} />}
        <div
          className={`w-full rounded-t-sm transition-all duration-300 ${colorClass}`}
          style={{ height: `${heightPercent}%` }}
        />
      </div>

      {/* duration label */}
      <p className="text-xs text-gray-500 leading-none text-center">
        {slot.durationLabel ?? "—"}
      </p>

      {/* day-context overlay: effort color dot + energy emoji (reserved height) */}
      <div className="flex items-center justify-center gap-0.5 h-3" aria-hidden="true">
        {slot.mentalEffort && (
          <span
            className={`w-2 h-2 rounded-full ${MENTAL_EFFORT_META[slot.mentalEffort].color}`}
            title={MENTAL_EFFORT_META[slot.mentalEffort].label}
          />
        )}
        {slot.energyState && (
          <span className="text-[10px] leading-none" title={ENERGY_STATE_META[slot.energyState].label}>
            {ENERGY_STATE_META[slot.energyState].emoji}
          </span>
        )}
      </div>

      {/* weekday label */}
      <p className="text-xs text-gray-400 font-medium leading-none">{slot.label}</p>
    </div>
  );
}

export function SleepHistoryChart({ slots }: SleepHistoryChartProps) {
  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">
        Últimos 7 días
      </p>
      <div className="flex items-end gap-2">
        {slots.map((slot) => (
          <DayBar key={slot.date} slot={slot} />
        ))}
      </div>

      {/* legend */}
      <div className="flex gap-3 mt-4 justify-center">
        <LegendItem color="bg-green-500" label="≥ 7h" />
        <LegendItem color="bg-yellow-400" label="5–7h" />
        <LegendItem color="bg-red-500" label="< 5h" />
        <LegendItem color="bg-gray-700" label="Sin dato" />
      </div>
    </div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
