# FASE 5: Motor del Protocolo — 3 Pilares + Recomendación

**Status**: ⏸️ PENDIENTE
**Prioridad**: Alta
**Dependencias**: FASE_4

## Contexto: el protocolo completo

La app no es solo un diario — es un coach activo. Cada vez que se abre, calcula y muestra las 3 señales del protocolo:

```
Pilar 1 — Melatonina
  melatonin_time = avg_bedtime(últimos 3 días) - 5.5h
  → "Tomá 0.5mg a las HH:MM esta noche"

Pilar 2 — Luz de mañana
  show_light_banner = hora_actual < current_wake_anchor + 30min
  → Banner: "¿Ya fuiste a la ventana? 15 min de luz ahora"

Pilar 3 — Wake anchor
  → "Esta semana: despertate a las HH:MM todos los días"
  (avanza 20 min cada lunes — lo gestiona FASE_4)

Recomendación bedtime
  diff = avg_bedtime - target_bedtime
  suggested = avg_bedtime - min(diff, 30min)
  → "Esta noche intentá dormirte a las HH:MM"
```

**Nota sobre crossover de medianoche:** Bedtimes entre las 23:00 y las 05:00 requieren conversión a "minutos nocturnos" para que el promedio sea correcto:
- `23:30 → 23.5 * 60 = 1410 min`
- `02:00 → (24 + 2) * 60 = 1560 min`

## Orden de ejecución

1. Tarea 5.A — sleep.ts funciones puras (lógica primero)
2. Tarea 5.B — Tests unitarios (cubrir los 3 pilares + bedtime rec)
3. Tarea 5.C — ProtocolCard component (muestra los 3 pilares)
4. Tarea 5.D — LightBanner component
5. Tarea 5.E — Integrar en HomePanel

## Tareas

### Tarea 5.A: src/lib/sleep.ts — Funciones Puras

- Archivo: `src/lib/sleep.ts` (crear)
- Funciones:

  1. `calcDuration(bedtime: string, wakeTime: string): string`
     - Recibe ISO timestamps → retorna `'7h 30m'`

  2. `toNightMinutes(isoTimestamp: string): number`
     - 23:30 → 1410, 00:00 → 1440, 02:00 → 1560
     - Regla: si hora < 12 → sumar 1440

  3. `fromNightMinutes(minutes: number): string`
     - 1560 → `'02:00'`, 1410 → `'23:30'`

  4. `calcMelatoninTime(recentLogs: SleepLog[]): string | null`
     - Si < 1 log con bedtime → null
     - `avg = promedio de toNightMinutes(bedtime)` de últimos 3 logs
     - `melatoninMin = avg - 5.5 * 60`
     - Retorna `fromNightMinutes(melatoninMin)`

  5. `shouldShowLightBanner(goal: SleepGoal, now: Date): boolean`
     - `wakeAnchorMin = timeToMinutes(goal.current_wake_anchor)` (minutos del día, 0-1440)
     - `nowMin = now.getHours() * 60 + now.getMinutes()`
     - Retorna `nowMin <= wakeAnchorMin + 30`

  6. `calcBedtimeRecommendation(recentLogs: SleepLog[], goal: SleepGoal): Recommendation | null`
     - Si < 1 log → null
     - `avg = promedio bedtimes (nightMinutes)`
     - `targetMin = toNightMinutes(goal.target_bedtime)`
     - `diff = avg - targetMin`
     - `suggested = avg - Math.min(diff, 30)`
     - `melatoninTime = calcMelatoninTime(recentLogs) ?? ''`
     - Retorna `Recommendation` completo con los 3 pilares

- Todas puras, sin side effects, sin imports de Supabase o React

### Tarea 5.B: Tests Unitarios

- Archivo: `src/__tests__/sleep.spec.ts` (crear)
- Casos a cubrir:

  `toNightMinutes / fromNightMinutes`:
  - [ ] `'23:30'` → 1410 (PM, antes de medianoche)
  - [ ] `'00:00'` → 1440 (medianoche exacta)
  - [ ] `'02:00'` → 1560 (AM, después de medianoche)
  - [ ] roundtrip: `fromNightMinutes(toNightMinutes(t)) === t`

  `calcMelatoninTime`:
  - [ ] 0 logs → null
  - [ ] 1 log bedtime 02:00 → melatonina a las 20:30 (1560 - 330 = 1230 min → 20:30)
  - [ ] 3 logs promedio 01:00 → melatonina a las 19:30

  `shouldShowLightBanner`:
  - [ ] now < wake_anchor + 30min → true
  - [ ] now > wake_anchor + 30min → false

  `calcBedtimeRecommendation`:
  - [ ] promedio > 30min de meta → sugiere promedio - 30min
  - [ ] promedio ≤ 30min de meta → sugiere la meta
  - [ ] 0 logs → null
  - [ ] `Recommendation` retornado tiene `melatoninTime` y `wakeAnchor` populados

### Tarea 5.C: ProtocolCard Component

- Archivo: `src/components/ProtocolCard.tsx` (crear)
- Qué hacer:
  1. Recibe `recommendation: Recommendation | null` y `goal: SleepGoal | null`
  2. Si sin goal → "Configura el protocolo en Settings"
  3. Si hay goal → muestra 3 filas:
     ```
     🌙  Esta noche dormite a las  01:30
     💊  Melatonina a las          20:00   (si melatonin_enabled)
     ⏰  Wake anchor esta semana   09:00
     ```
  4. Si llegó a la meta de bedtime → `'🎯 ¡Fase A completada!'`

### Tarea 5.D: LightBanner Component

- Archivo: `src/components/LightBanner.tsx` (crear)
- Qué hacer:
  1. Solo se renderiza si `shouldShowLightBanner() === true`
  2. Banner prominente arriba del HomePanel:
     ```
     ☀️  Son las 9:15am — ve a la ventana 15 minutos ahora
         [Ya lo hice ✓]
     ```
  3. Botón "Ya lo hice" → oculta el banner para el día actual (guardar en `useStorage` con key `light_done_${today}`)
  4. No vuelve a aparecer si ya se hizo hoy

### Tarea 5.E: Integrar en HomePanel

- Archivo: `src/components/panels/HomePanel.tsx` (modificar)
- Orden de render:
  1. `<LightBanner />` (si aplica)
  2. `<ProtocolCard />` (3 pilares + bedtime rec)
  3. `<DailyStatus />` (duración de hoy)
  4. `<SleepLogger />` (botones)

## Criterios de Aceptación

- [ ] `npm test` pasa — todos los casos del spec
- [ ] LightBanner aparece solo si la hora es ≤ wake_anchor + 30min
- [ ] LightBanner no reaparece si se marcó "Ya lo hice" hoy
- [ ] La hora de melatonina cambia dinámicamente según el promedio real de bedtime
- [ ] Wake anchor muestra el valor de la semana actual (no la meta final)
- [ ] `npm run compile` y `npm run lint` pasan
