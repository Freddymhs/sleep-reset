/**
 * coaching.ts — Tips contextuales del protocolo DSPD.
 *
 * El app sabe QUÉ hacer (recomendaciones del protocolo) pero también necesita
 * decirle al usuario CÓMO comportarse en cada momento crítico. Estos tips
 * cubren los gaps de conocimiento entre el dato y la conducta.
 *
 * Cada tip tiene un trigger context y se muestra una vez (o cada vez que
 * el contexto se cumple, según el ID).
 */

export type CoachingContext =
  | "premature_wake"
  | "first_setup"
  | "phase_advance"
  | "streak_break"
  | "bedtime_struggle";

export interface CoachingAction {
  type: "do" | "avoid";
  text: string;
}

export interface CoachingTip {
  id: CoachingContext;
  title: string;
  actions: CoachingAction[];
  /** Por qué biológico — opcional, una línea. */
  rationale?: string;
}

export const COACHING_TIPS: Record<CoachingContext, CoachingTip> = {
  premature_wake: {
    id: "premature_wake",
    title: "Despertar prematuro registrado",
    actions: [
      { type: "do", text: "Levantate de la cama ahora" },
      { type: "do", text: "Luz tenue, libro físico o podcast" },
      { type: "avoid", text: "NO uses pantallas brillantes" },
      { type: "avoid", text: "NO duermas siesta hoy" },
      { type: "do", text: "Despertate a tu wake anchor SIEMPRE, sin importar lo que dormiste" },
    ],
    rationale:
      "Forzar el sueño activa más alerta. La consistencia del despertar es más potente que la cantidad de sueño esa noche.",
  },

  first_setup: {
    id: "first_setup",
    title: "Tu protocolo está activo",
    actions: [
      { type: "do", text: "Esta noche: tomá melatonina a la hora indicada" },
      { type: "do", text: "Acostate a tu hora habitual o ~30 min antes" },
      { type: "do", text: "Mañana despertate al wake anchor SIN snooze" },
      { type: "do", text: "15 min de luz dentro de los 30 min de despertar" },
    ],
    rationale: "La consistencia importa más que la perfección.",
  },

  phase_advance: {
    id: "phase_advance",
    title: "Wake anchor avanzó esta semana",
    actions: [
      { type: "do", text: "Desde mañana, despertate a la nueva hora todos los días" },
      { type: "do", text: "Aunque hayas dormido mal — la consistencia es la palanca" },
      { type: "avoid", text: "Si no llegás 3 días seguidos: revisá Settings y bajá un escalón" },
    ],
  },

  streak_break: {
    id: "streak_break",
    title: "Patrón de despertares prematuros detectado",
    actions: [
      { type: "do", text: "Confirmá que tomás melatonina exactamente a la hora indicada" },
      { type: "do", text: "Habitación oscura, fresca (<19°C) y silenciosa" },
      { type: "avoid", text: "Cero cafeína después de las 14:00" },
      { type: "avoid", text: "Nada de alcohol o comida pesada cerca del bedtime" },
    ],
  },

  bedtime_struggle: {
    id: "bedtime_struggle",
    title: "Tips para conciliar el sueño",
    actions: [
      { type: "do", text: "Habitación oscura, fresca (<19°C) y silenciosa" },
      { type: "do", text: "Si no dormís en 30 min: levantate de la cama" },
      { type: "do", text: "Fuera de la cama: libro físico o podcast con luz tenue" },
      { type: "avoid", text: "NO uses pantallas brillantes" },
      { type: "avoid", text: "NO mires el reloj — solo aumenta la ansiedad" },
    ],
    rationale:
      "Quedarte forzando en la cama activa más alerta. Salir, hacer algo aburrido, y volver cuando aparezca sueño real funciona mejor.",
  },
};

/**
 * Returns true if the timestamp is within the last `hours` from now.
 */
export function isWithinHoursAgo(isoTimestamp: string | null, hours: number): boolean {
  if (!isoTimestamp) return false;
  const ageHours = (Date.now() - new Date(isoTimestamp).getTime()) / 3_600_000;
  return ageHours >= 0 && ageHours <= hours;
}
