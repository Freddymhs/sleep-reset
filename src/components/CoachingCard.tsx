/**
 * CoachingCard — Tip contextual del protocolo.
 *
 * Renderiza un CoachingTip: título, lista de acciones (✓/✗) y rationale
 * opcional. Botón "Entendido" llama onDismiss si está presente.
 */

import type { CoachingTip } from "../lib/coaching";

interface CoachingCardProps {
  tip: CoachingTip;
  onDismiss?: () => void;
}

export function CoachingCard({ tip, onDismiss }: CoachingCardProps) {
  return (
    <div className="bg-indigo-950/60 border border-indigo-700/40 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-semibold text-indigo-100">{tip.title}</p>

      <ul className="space-y-1.5">
        {tip.actions.map((action, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs">
            <span
              className={
                action.type === "do"
                  ? "text-green-400 font-bold mt-0.5"
                  : "text-red-400 font-bold mt-0.5"
              }
              aria-hidden
            >
              {action.type === "do" ? "✓" : "✗"}
            </span>
            <span className="text-gray-200">{action.text}</span>
          </li>
        ))}
      </ul>

      {tip.rationale && (
        <p className="text-[11px] text-gray-400 italic leading-relaxed">{tip.rationale}</p>
      )}

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="w-full mt-1 py-2 text-xs font-medium text-indigo-200 hover:text-white
            border border-indigo-700/60 rounded-lg transition-colors"
        >
          Entendido
        </button>
      )}
    </div>
  );
}
