# FASE 8: Esfuerzo Mental ↔ Calidad de Despertar (Correlación)

**Status**: ⏸️ PENDIENTE
**Prioridad**: Media (post-MVP — la app ya cumplió su objetivo de reset de sueño)
**Dependencias**: FASE_6 (historial), FASE_5 (lógica pura + tests)

## Contexto: por qué esta fase

El reset de sueño funcionó: el ciclo está corregido (dormir ~18–21h, despertar ~04–06h). El siguiente problema **no es cuándo duermo, sino por qué algunos días despierto lúcido a las 4 y otros "de más" a las 6**. La hipótesis del usuario: el **esfuerzo mental del día** y el **estado de ánimo/energía al final del día** determinan la calidad del despertar siguiente. La melatonina entra como variable: rutina = 1 dosis ~1h antes de dormir; cuando la mente está muy ruidosa, una 2da dosis tras esperar 1h.

La app ya deriva el "resultado del despertar" de `wake_time` + `quality`. **Lo que falta es la causa.** Esta fase agrega la captura de la causa y los gráficos de correlación para encontrar el "cruce".

```
Esfuerzo del día  ─┐
Estado de ánimo   ─┼──► (correlación) ──► hora/calidad de despertar
Nº dosis melatonina┘
```

## Decisión de modelado (el porqué)

**Tabla nueva `day_context` (1 fila por día), NO columnas en `sleep_logs`.**

- `sleep_logs` es **N por día** (migration 004: despertar prematuro + reintento). El esfuerzo mental y el estado de ánimo son **1 por día**, no por sesión. Meterlos en `sleep_logs` los duplicaría en noches fragmentadas y rompería los agregados de `buildDaySlots`.
- El contexto del día se registra **de día** (al terminar la jornada / antes de dormir), desacoplado del evento "Voy a dormir". Tabla por fecha respeta esa cadencia y permite editar (upsert).
- `sleep_logs` queda puro (evento de sueño). La correlación se hace por `JOIN` en `date`.

**Excepción: `melatonin_doses` SÍ va en `sleep_logs`** (entero). La 2da dosis se decide *durante* el intento de dormir, atada a esa sesión concreta, no al ánimo del día. Así correlaciona dosis↔esa noche sin ambigüedad.

> Documentar esta decisión en `docs/decisions/DECISION_DAY_CONTEXT.md` cuando se implemente.

## Enums propuestos (nombres que desambiguan la CAUSA)

**`mental_effort` — esfuerzo mental del día** (ordinal, 3 niveles):

| valor | etiqueta UI | significado |
|---|---|---|
| `light` | Menor | día tranquilo, poca demanda cognitiva |
| `moderate` | Moderado | jornada normal |
| `heavy` | Mayor | estudio/trabajo muy concentrado, termina exhausto |

Ordinal → sirve como eje X numérico (0,1,2) en el scatter.

**`energy_state` — estado de energía/ánimo al final del día** (4 estados, desambiguan causa no solo nivel):

| valor | etiqueta UI | causa que codifica |
|---|---|---|
| `bored_idle` | Aburrido / sin hacer nada | energía residual por **inactividad** ("de sobra" por no hacer nada) |
| `wired_overactive` | Hiperactivo / mente acelerada | exceso de ideas/tareas en mente ("de sobra" por **hiperactividad**) |
| `drained_restless` | Exhausto / mente sin soluciones | cansancio impulsivo, mente ruidosa pero agotada |
| `clear_calm` | Lúcido / energía buena | estado óptimo (hipótesis: predice despertar ~4am) |

Punto clave: "energía de sobra" es ambiguo → se parte en `bored_idle` vs `wired_overactive`. Ese es el valor diagnóstico.

## Orden de ejecución

1. 8.A — Schema + tipos (lógica de datos primero)
2. 8.B — Data access (hooks)
3. 8.C — Lógica pura + tests (antes de UI, como FASE 5)
4. 8.D — Captura UX (chips low-friction)
5. 8.E — Overlay en historial
6. 8.F — Panel Insights (gráficos de correlación)
7. 8.G — Pulido

## Tareas

### Tarea 8.A: Schema + Tipos

- Archivo: `supabase/migrations/005_day_context.sql` (crear)
  - Tabla `day_context`: `id`, `user_id`, `date`, `mental_effort (text)`, `energy_state (text)`, `notes (text)`, `created_at`, `updated_at`.
  - `unique (user_id, date)` → 1 por día, upsert.
  - Check constraints de los 3 valores `mental_effort` y los 4 `energy_state`.
  - Índice `(user_id, date)` + 4 RLS policies own (espejo de `sleep_logs`).
  - `alter table sleep_logs add column melatonin_doses smallint not null default 1` + check `between 0 and 4`.
  - `updated_at` lo setea el cliente en cada UPDATE (convención del repo, no hay trigger).
- Archivo: `src/lib/types.ts` (modificar)
  - `MentalEffort`, `EnergyState` (union types).
  - `DayContext`, `NewDayContext`, `UpdateDayContext` (patrón Omit como `SleepLog`/`SleepGoal`).
  - Añadir `melatonin_doses: number` a `SleepLog`.
- Archivo: `src/lib/constants.ts` (modificar)
  - `DB_TABLES.DAY_CONTEXT`.
  - Mapas de etiquetas ES + color + emoji por enum (patrón `WEEKDAY_LABELS_ES`).
  - Rango de despertar `WAKE_RANGE = { from: '04:00', to: '06:00' }` para escalar el eje Y del scatter (sin corte binario).

📚 Referencia: `supabase/migrations/001_sleep_tables.sql`, `src/lib/types.ts:28-79`, `src/lib/constants.ts:5-62`

### Tarea 8.B: Data Access (hooks)

- Archivo: `src/hooks/useDayContext.ts` (crear) — espejo de `useSleepLog`:
  - `upsertDayContext({ mental_effort, energy_state, notes? })` → upsert por `(user_id, date)`.
  - `getDayContext(date)` → fila o null.
  - `getRecentContext(days)` → array ordenado `date DESC`.
- Archivo: `src/hooks/useSleepLog.ts` (modificar)
  - `setMelatoninDoses(logId, n)` → `UPDATE sleep_logs SET melatonin_doses` sobre la sesión activa.

📚 Referencia: `src/hooks/useSleepLog.ts:49-256`

### Tarea 8.C: Lógica Pura + Tests

- Archivo: `src/lib/insights.ts` (crear) — puro, sin Supabase/React, reutiliza `toNightMinutes`:
  - `wakeMinutesOf(log)` → hora de despertar en minutos nocturnos.
  - `effortBreakdown(rows)` → por `mental_effort`: hora media de despertar.
  - `energyBreakdown(rows)` → ídem por `energy_state`.
  - `dosesBreakdown(logs)` → hora media de despertar para 1 vs 2 dosis.
  - `buildCrossInsight(...)` → string tipo coaching ("Tus mejores despertars ~4am coinciden con esfuerzo Moderado + Lúcido y 1 dosis…").
- Archivo: `src/lib/__tests__/insights.spec.ts` (crear) — cubrir cada breakdown, promedios de despertar en el rango 04–06, casos con datos insuficientes → null/empty.

📚 Referencia: `src/lib/sleep.ts:57-64` (toNightMinutes), `src/__tests__/sleep.spec.ts`

### Tarea 8.D: Captura UX (low-friction)

- Archivo: `src/components/SleepLogger.tsx` (modificar)
  - Mini-prompt 2 filas de chips de selección única (NO inputs texto), tras marcar bedtime:
    ```
    ¿Cómo estuvo tu día?
    Esfuerzo:  [Menor] [Moderado] [Mayor]
    Mente:     [Aburrido] [Hiperactivo] [Exhausto] [Lúcido]
    ```
  - **Skippable**: si no toca nada, no se crea `day_context` (correlación tolera nulos). Cero fricción obligatoria.
  - Upsert: si el día ya está marcado, pre-rellenar y editar.
  - Control de dosis en sesión activa: `Melatonina: [1 dosis] (+ tomé otra)`. Default 1; "+ tomé otra" → 2 sobre `activeLog`.
- Archivo: `src/components/panels/HomePanel.tsx` (modificar) — cablear refresh.

📚 Referencia: `src/components/SleepLogger.tsx:26-183` (estilo chips/botones), `src/components/ProtocolSetupForm.tsx`

### Tarea 8.E: Overlay en historial

- Archivo: `src/lib/sleep.ts` (modificar) — extender `DaySlot` + `buildDaySlots` con `mentalEffort`/`energyState` opcionales (merge de `day_context` por fecha).
- Archivo: `src/components/SleepHistoryChart.tsx` (modificar) — bajo cada barra: chip de esfuerzo (color) + emoji de estado. Sin pantalla nueva.

📚 Referencia: `src/lib/sleep.ts:270-334`, `src/components/SleepHistoryChart.tsx:103-124`

### Tarea 8.F: Panel Insights

- Archivo: `src/components/panels/InsightsPanel.tsx` (crear) — o sub-vista en `HistoryPanel` (ver duda #7):
  1. **Scatter esfuerzo↔despertar** (vista estrella): X = `mental_effort` (0/1/2), Y = hora despertar (4am abajo-bueno … 6am+ arriba), color = `energy_state`, borde/tamaño = `melatonin_doses`. Solo divs+Tailwind, como el chart actual (sin libs).
  2. **Breakdown cards**: medias por esfuerzo, por estado, por dosis.
  3. **Insight del cruce**: texto de `buildCrossInsight`.
- Si es tab nuevo: añadir a `BottomNav` (`ActivePanel = ... | "insights"`).

📚 Referencia: `src/components/SleepHistoryChart.tsx`, `src/components/panels/HistoryPanel.tsx:57-100`, `src/components/SleepStats.tsx`

### Tarea 8.G: Pulido

- Micro-recordatorio "esperá 1h completa antes de la 2da dosis" (patrón `CoachingCard`, no bloquea).
- Estados vacíos: "Necesitás ~7–14 días de datos para ver patrones".
- `npm run compile` + `npm run lint` (zero-warning) + `npm test` verdes.

## Criterios de Aceptación

- [ ] Migration 005 aplicada: `day_context` con RLS + `sleep_logs.melatonin_doses`.
- [ ] Captura de esfuerzo/estado es opcional (skippable) y editable (upsert) — no añade fricción al flujo de 1 tap.
- [ ] `npm test` cubre todos los breakdowns de `insights.ts`.
- [ ] El scatter agrupa visualmente días "Mayor + Exhausto + 2 dosis" (despertar tarde) vs "Moderado + Lúcido + 1 dosis" (despertar temprano).
- [ ] Insight del cruce genera texto legible con datos reales.
- [ ] `npm run compile` y `npm run lint` pasan.

## Decisiones resueltas (usuario, 2026-06-17)

1. **Rango de despertar = 04:00–06:00.** Sin corte binario "bueno/malo": la métrica es la **hora media de despertar** por categoría (más temprano dentro del rango = mejor). → `insights.ts` no necesita `isGoodWake` binario; usar promedios de `wakeMinutesOf`.
2. **Esfuerzo = 1 por día** (la tabla `day_context` con `unique (user_id, date)` ya lo refleja).
3. **Dosis = solo conteo** (`melatonin_doses`: 1, luego 2 si toma otra). Sin hora ni delay.
4. **Captura del contexto = al marcar "Voy a dormir"** (chips en `SleepLogger`).
5. **Estado vacío** hasta ~7–14 días: mostrar "Seguí registrando — faltan X días para ver patrones" en vez de gráfico vacío (tarea 8.G).
6. **Panel Insights = tab nuevo en `BottomNav`** (`ActivePanel = ... | "insights"`), no sub-vista de History.
