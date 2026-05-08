/**
 * SleepLogger — Buttons to manage the active sleep session.
 *
 * - Active session (in-progress sleep) → wake buttons + cancel
 * - No active session                  → "Voy a dormir" + manual entry link
 *
 * Today's completed session is shown by DailyStatus (no duplication here).
 * Multiple sessions per day are allowed — DSPD users may sleep morning + night.
 */

import { useState } from "react";
import type { SleepLog } from "../lib/types";
import { formatTime } from "../lib/sleep";

interface SleepLoggerProps {
  /** The active session: bedtime != null && wake_time == null. Null when no session. */
  activeLog: SleepLog | null;
  onLogBedtime: () => Promise<void>;
  onLogWakeTime: () => Promise<void>;
  onLogPrematureWake: () => Promise<void>;
  onCancelActive: () => Promise<void>;
  /** For DSPD users who collapse without logging: backfill a complete past session. */
  onLogManualSession: (bedtimeHHMM: string, wakeTimeHHMM: string) => Promise<void>;
}

export function SleepLogger({
  activeLog,
  onLogBedtime,
  onLogWakeTime,
  onLogPrematureWake,
  onCancelActive,
  onLogManualSession,
}: SleepLoggerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualBedtime, setManualBedtime] = useState("23:00");
  const [manualWake, setManualWake] = useState("09:00");

  const wrap = (action: () => Promise<void>, errLabel: string) => async () => {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : errLabel);
    } finally {
      setLoading(false);
    }
  };

  // 1. Active session takes priority over a completed one (e.g. user already
  //    started a new bedtime after a premature wake earlier the same night).
  if (activeLog?.bedtime) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-gray-400 text-center">
          Dormiste a las {formatTime(activeLog.bedtime)}
        </p>

        <button
          onClick={wrap(onLogWakeTime, "Error al registrar wake time")}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white"
        >
          Me desperté ☀️
        </button>

        <button
          onClick={wrap(onLogPrematureWake, "Error al registrar despertar prematuro")}
          disabled={loading}
          className="w-full py-2 px-4 rounded-xl font-medium text-xs transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-gray-200 border border-gray-600"
        >
          Despertar prematuro 😞
        </button>

        <button
          onClick={wrap(onCancelActive, "Error al anular registro")}
          disabled={loading}
          className="text-xs text-gray-500 underline hover:text-gray-300 disabled:opacity-50"
        >
          Anular esta noche
        </button>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    );
  }

  // 2. No active session — bedtime button is always available.
  //    Today may already have a completed session (morning sleep, etc.) — that's
  //    fine, multiple sessions per day are supported. DailyStatus shows it.
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={wrap(onLogBedtime, "Error al registrar bedtime")}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white"
      >
        Voy a dormir 🌙
      </button>

      {!manualOpen && (
        <button
          onClick={() => setManualOpen(true)}
          className="text-xs text-gray-500 underline hover:text-gray-300"
        >
          Registrar sueño pasado
        </button>
      )}

      {manualOpen && (
        <div className="bg-gray-800 rounded-xl p-3 space-y-2">
          <p className="text-xs text-gray-400 text-center">
            Si te dormiste sin marcar — ingresá las horas en formato 24h
          </p>
          <div className="flex gap-2 items-center">
            <label className="flex-1 text-xs text-gray-400">
              Dormí (24h)
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-2][0-9]:[0-5][0-9]"
                placeholder="07:00"
                maxLength={5}
                value={manualBedtime}
                onChange={(e) => setManualBedtime(e.target.value)}
                className="block w-full mt-1 bg-gray-900 text-white text-sm rounded px-2 py-1.5 border border-gray-700 font-mono"
              />
            </label>
            <label className="flex-1 text-xs text-gray-400">
              Desperté (24h)
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-2][0-9]:[0-5][0-9]"
                placeholder="16:50"
                maxLength={5}
                value={manualWake}
                onChange={(e) => setManualWake(e.target.value)}
                className="block w-full mt-1 bg-gray-900 text-white text-sm rounded px-2 py-1.5 border border-gray-700 font-mono"
              />
            </label>
          </div>
          <p className="text-[10px] text-gray-500 text-center">
            Ej: 7am = <span className="font-mono">07:00</span> · 4:50pm = <span className="font-mono">16:50</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={wrap(async () => {
                if (!/^[0-2][0-9]:[0-5][0-9]$/.test(manualBedtime) ||
                    !/^[0-2][0-9]:[0-5][0-9]$/.test(manualWake)) {
                  throw new Error("Formato inválido — usá HH:MM 24h (ej 07:00, 16:50)");
                }
                await onLogManualSession(manualBedtime, manualWake);
                setManualOpen(false);
              }, "Error al registrar sesión")}
              disabled={loading}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium
                disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Registrar
            </button>
            <button
              onClick={() => setManualOpen(false)}
              className="px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
