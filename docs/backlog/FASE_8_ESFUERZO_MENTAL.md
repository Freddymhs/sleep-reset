# FASE 8: Esfuerzo Mental ↔ Calidad de Despertar (Correlación)

**Status**: ⏸️ PENDIENTE
**Prioridad**: Media (post-MVP — el reset de sueño ya cumplió su objetivo)
**Dependencias**: FASE_6 (historial), FASE_5 (lógica pura + tests)

> **Nota de proceso (2026-06-19):** Este documento fue auditado por 4 agentes de
> código + 2 de investigación científica + 2 de contra-análisis ciego. Lo que sigue
> es la versión refinada: integra evidencia, cierra los gaps estructurales detectados
> y deja explícitos los riesgos de N=1. **Sigue siendo diseño, no implementación.**

---

## 1. Contexto: por qué esta fase

El reset funcionó: el ciclo está corregido (dormir ~18–21h, despertar ~04–06h). El
problema que queda **no es cuándo duermo, sino por qué algunos días despierto lúcido
a las 4 y otros "de más" a las 6**.

**Hipótesis del usuario:** el *esfuerzo mental del día* + el *estado de energía/ánimo
al final del día* modulan la calidad del despertar siguiente.

**Matiz que aporta la evidencia (no invalida la hipótesis, la precisa):** el efecto no
es directo `día → despertar`. La cadena real es:

```
esfuerzo/carga cognitiva del día
        │
        ▼
  arousal pre-sueño (cognitivo y/o somático)   ← variable mediadora real
        │
        ▼
  latencia + fragmentación del sueño
        │
        ▼
  etapa de sueño al despertar  ← determinante #1 de la inercia (lúcido vs "de más")
```

Es decir: la hipótesis captura una **causa upstream real**, pero la variable proximal
es la *arquitectura del sueño de esa noche* (no medible directamente con esta app). Por
eso esta fase **correlaciona señales upstream**, y debe comunicar sus hallazgos como
*asociación*, nunca como causa (ver §7, disclaimer N-of-1).

La app ya deriva el "resultado" del despertar de `wake_time` + `quality`. **Lo que falta
es capturar la causa upstream** y mostrar el cruce.

---

## 2. Decisión de modelado (el porqué)

**Tabla nueva `day_context` (1 fila por día), NO columnas en `sleep_logs`.**

- `sleep_logs` es **N por día** (migration 004: despertar prematuro + reintento). El
  esfuerzo y el estado son **1 por día**, no por sesión. Meterlos en `sleep_logs` los
  duplicaría en noches fragmentadas y rompería los agregados.
- El contexto del día se registra de día (al terminar la jornada / antes de dormir),
  desacoplado del evento "Voy a dormir". Tabla por fecha respeta esa cadencia y permite
  editar (upsert).
- `sleep_logs` queda puro (evento de sueño). La correlación se hace **a nivel NOCHE**
  (ver §3), no a nivel sesión.

**`melatonin_doses` SÍ va en `sleep_logs`** (entero por sesión). Refleja el protocolo
real del usuario (§4). En noche fragmentada las dosis se **suman** al colapsar la noche.

> Documentar en `docs/decisions/DECISION_DAY_CONTEXT.md` al implementar.

---

## 3. ⚠️ Unidad de agregación = NOCHE (el gap que invalidaba todo)

**Problema detectado:** `sleep_logs` es N-por-fecha; `day_context` es 1-por-fecha. Un
`JOIN day_context.date = sleep_logs.date` ingenuo:

1. **Doble-cuenta** las noches fragmentadas (1 contexto × N sesiones) → sesga la
   correlación justo hacia las peores noches.
2. **Ambigüedad de `wake_time`**: si hubo despertar prematuro 04:00 + reintento 06:30,
   ¿qué despertar grafica el scatter? Cualquier elección naive inventa el dato.

**Decisión:** `insights.ts` opera sobre **noches colapsadas**, no sobre `sleep_logs`
crudos. Un colapsador es el único dueño del merge:

```ts
// Una noche = todas las sesiones de una misma fecha, colapsadas + su contexto del día.
type NightRow = {
  date: ISODate;
  wakeMinutes: number;        // del wake REAL de la noche (ver regla abajo)
  melatoninDoses: number;     // SUMA de doses de las sesiones de esa noche
  fragmented: boolean;        // hubo >1 sesión o alguna 'premature'
  ctx?: DayContext;           // contexto del día (opcional — skippable)
};

function collapseNights(logs: SleepLog[], ctx: DayContext[]): NightRow[]
```

**Regla del `wake_time` de la noche:** el despertar que cuenta es el de la **última
sesión completada** de la fecha (latest `wake_time`). Las sesiones `quality='premature'`
intermedias marcan `fragmented = true` pero **no** aportan su wake al promedio (fueron
interrupciones, no el despertar real). Esto resuelve el doble-conteo y la ambigüedad de
un solo golpe.

`buildDaySlots` (FASE 6) ya agrega por día con la misma lógica (earliest bedtime / latest
wake) — `collapseNights` reutiliza ese criterio para no tener dos verdades.

---

## 4. Modelo de melatonina (realidad del usuario — NO el 0.5mg idealizado)

> **Corrección importante vs `CONCEPTO.md`.** `CONCEPTO.md` (Pilar 1) describe un uso
> *cronobiótico* idealizado: 0.5mg, 5.5h antes, "nunca más". **El uso real del usuario
> es distinto y es el que esta fase modela:**

- **3mg** por dosis, tomada **~1h antes** de querer dormir (uso *hipnótico*, no
  cronobiótico).
- Si no logra dormir, **1 dosis adicional por hora**.
- **Máximo histórico observado: 3 dosis** (una sola vez). Casi siempre **2**. Nunca más
  de 3.
- Para el usuario esto **funciona y es valioso** — no se trata como conducta a corregir.
  El contador es descriptivo, no normativo.

**Implicancia para el schema:** `melatonin_doses smallint not null default 1
check (melatonin_doses between 1 and 3)`. Default 1; el rango 1–3 refleja la realidad
(no 0–4 arbitrario). `melatonin_doses` es por sesión; se **suma** al colapsar la noche.

> ✅ **Reconciliado (D2, 2026-06-19):** `CONCEPTO.md` Pilar 1 describía un uso `0.5mg
> cronobiótico` que no coincide con la práctica real. Se actualizó `CONCEPTO.md` Pilar 1 al
> uso hipnótico real (3mg) junto con esta revisión.

---

## 5. Enums (nombres que desambiguan la CAUSA)

### `mental_effort` — esfuerzo cognitivo del día (ordinal, 3 niveles)

| valor | etiqueta UI | significado |
|---|---|---|
| `light` | Menor | día tranquilo, poca demanda cognitiva |
| `moderate` | Moderado | jornada normal |
| `heavy` | Mayor | estudio/trabajo muy concentrado, termina exhausto |

Constructo validado (*cognitive load* / fatiga mental afecta latencia y sueño profundo).
Ordinal → eje X numérico (0,1,2) del scatter. **Mantener.**

### `energy_state` — estado al final del día (4 estados)

| valor | etiqueta UI | constructo que codifica | validez |
|---|---|---|---|
| `wired_overactive` | Hiperactivo / mente acelerada | **arousal cognitivo ALTO** (predictor #1 de mal despertar) | ✅ el más validado (PSAS) |
| `drained_restless` | Exhausto / mente ruidosa | arousal cognitivo alto + energía baja (el peor combo) | ✅ clínicamente relevante |
| `clear_calm` | Lúcido / energía buena | arousal bajo = estado pre-sueño ideal | ✅ ancla "bueno" |
| `bored_idle` | Aburrido / sin hacer nada | baja activación + energía residual | ⚠️ el más débil teóricamente |

> Los 4 estados mezclan **dos ejes** (arousal × energía/valencia). Funciona como UX
> (son estados que el usuario reconoce) pero no es un solo constructo limpio. Por eso se
> suman dos dimensiones medibles independientes (abajo).

### `physical_activity` — actividad física del día (ordinal, 4 niveles) ✅ ADOPTADO (D1)

| valor | etiqueta UI | significado |
|---|---|---|
| `none` | Nada | día sedentario |
| `light` | Poca | caminatas, tareas livianas |
| `moderate` | Moderada | ejercicio moderado |
| `intense` | Intensa | esfuerzo físico alto |

Es el **mejor predictor medible** detrás de `bored_idle`: más actividad → más presión
homeostática de sueño + más melatonina endógena (sinérgico con luz/anchor del protocolo).
Probablemente explica más varianza del despertar que el propio `bored_idle`. Ordinal →
segundo eje numérico para los breakdowns.

### `somatic_tension` — tensión corporal al acostarse (binario) ✅ ADOPTADO (D1)

| valor | etiqueta UI | constructo |
|---|---|---|
| `relaxed` | Relajado | arousal somático bajo |
| `tense` | Tenso | arousal somático alto |

La PSAS trata arousal cognitivo y somático como ejes **independientes**; `energy_state`
sólo cubre el cognitivo/energético. Este toggle cierra la dimensión somática faltante con
un solo tap.

> `bored_idle` se **mantiene** en `energy_state` (el usuario lo reconoce como estado),
> pero ahora su causa medible queda capturada por `physical_activity`. Los breakdowns
> podrán cruzar ambos.

---

## 6. Captura — respetar el "1 tap, cero fricción"

El log core (bedtime/wake) es **el único dato que guía el wake anchor**. Riesgo #1 de la
fase: añadir fricción y matar la adherencia al log core (survey fatigue: la adherencia
EMA cae con cada campo extra).

**Reglas de captura:**

- **Skippable de verdad:** si el usuario no toca nada, NO se crea `day_context`. La
  correlación tolera nulos. Cero fricción obligatoria.
- **Una dimensión por momento.** No pedir todo junto. Captura de chips tras marcar
  bedtime, en un paso intermedio (estado local `showDayContextPrompt`, antes del refresh).
- **≤5 chips por fila, un tap, sin sliders ni dropdowns** (380px).
- **Editable** (upsert por `(user_id, date)`): si el día ya está marcado, pre-rellenar.

---

## 7. Honestidad estadística — N=1 (obligatorio, no opcional)

La correlación es de **un solo sujeto**. Sin estos guardarraíles, el panel induce a leer
ruido como patrón y a cambiar el protocolo por causas espurias (autocorrelación día-a-día,
confounders no medidos, **causalidad reversa**: "despertó mal → reportó más esfuerzo" es
indistinguible de lo contrario).

**Gate progresivo por N (días con datos):**

| N días | Qué se muestra |
|---|---|
| < 7 | Solo puntos crudos. Sin tendencia, sin "correlación". |
| 7–13 | Puntos + mensaje "Seguí registrando — faltan X días para ver patrones". |
| ≥ 14 | Recién aquí: tendencia + **disclaimer N-of-1 fijo** bajo el gráfico. |

**Reglas del gráfico:**

- **Sin línea de regresión hasta N≥14**, y aun entonces siempre con los puntos detrás
  (una línea sola oculta la dispersión y exagera la señal).
- **Strip plot / dot plot con jitter leve** > scatter puro para N pequeño. Si se usa
  scatter, mostrar TODOS los puntos.
- **Ejes acotados al rango real** (no auto-zoom que dramatiza diferencias).
- **Disclaimer fijo** bajo cualquier vista de correlación: asociación ≠ causa; N-of-1.
- `buildCrossInsight` redacta **asociaciones**, nunca imperativos de protocolo. "Mejor
  despertar" = categoría con **menor `wakeMinutes` promedio** (más temprano dentro del
  rango), no un corte binario bueno/malo.

---

## 8. Orden de ejecución

1. **8.A** — Schema + tipos (datos primero)
2. **8.B** — Data access (hooks)
3. **8.C** — Lógica pura `collapseNights` + `insights.ts` + tests (antes de UI, como FASE 5)
4. **8.D** — Captura UX (chips skippable)
5. **8.E** — Overlay en historial
6. **8.F** — Panel Insights (gráfico con gate N + disclaimer)
7. **8.G** — Pulido

---

## 9. Tareas

### 8.A — Schema + Tipos

- `supabase/migrations/005_day_context.sql` (crear) — **espejo exacto de `001_sleep_tables.sql`:**
  - Tabla `day_context`: `id`, `user_id`, `date`, `mental_effort text`, `energy_state text`,
    `physical_activity text`, `somatic_tension text`, `notes text`, `created_at`, `updated_at`.
  - `unique (user_id, date)` → 1 por día, upsert. *(Distinto de `sleep_logs`, que perdió
    el unique en 004 a propósito — la divergencia es correcta: contexto 1/día vs sesiones
    N/día.)*
  - Check constraints: 3 `mental_effort`, 4 `energy_state`, 4 `physical_activity`,
    2 `somatic_tension`. Todas las columnas de enum **nullable** (captura parcial /
    skippable — el usuario puede tocar unas y otras no).
  - Índice `(user_id, date)` + **4 RLS policies own** (select/insert/update/delete),
    copiadas literal de `sleep_logs` (001:20-30).
  - `alter table sleep_logs add column melatonin_doses smallint not null default 1
    check (melatonin_doses between 1 and 3)` (ver §4).
  - **`updated_at`:** `sleep_logs` NO tiene `updated_at` ni trigger; `day_context` la
    introduce nueva, seteada por el cliente en cada UPDATE (convención de `sleep_goals`).
    Documentar que es deliberado, no copia de `sleep_logs`.
  - Si se agregan `physical_activity` / eje somático (D1, §5), incluir sus columnas +
    checks aquí.
- `src/lib/types.ts` (modificar) — patrón `Omit` como `SleepLog`/`SleepGoal`:
  - `MentalEffort`, `EnergyState`, `PhysicalActivity`, `SomaticTension` (union types).
  - `DayContext`, `NewDayContext`, `UpdateDayContext` (campos de enum opcionales/nullables).
  - Añadir `melatonin_doses: number` a `SleepLog`.
- `src/lib/constants.ts` (modificar):
  - `DB_TABLES.DAY_CONTEXT`.
  - Mapas etiqueta ES + color + emoji por enum (patrón `WEEKDAY_LABELS_ES`).
  - `WAKE_RANGE = { from: '04:00', to: '06:00' }` para escalar el eje Y (sin corte binario).
  - `MELATONIN_DOSES_RANGE = { min: 1, max: 3 }`.

📚 Ref verificada: `supabase/migrations/001_sleep_tables.sql:5-30`, `004_*.sql`,
`src/lib/types.ts:28-79`, `src/lib/constants.ts:5-62`

### 8.B — Data Access (hooks)

- `src/hooks/useDayContext.ts` (crear) — espejo de `useSleepLog`:
  - `upsertDayContext({ mental_effort, energy_state, notes? })` → upsert por `(user_id, date)`.
  - `getDayContext(date)` → fila o null.
  - `getRecentContext(days)` → array `date DESC`.
- `src/hooks/useSleepLog.ts` (modificar):
  - `setMelatoninDoses(logId, n)` → `UPDATE sleep_logs SET melatonin_doses` sobre la
    sesión activa (`getActiveLog`, useSleepLog.ts:75-98). Clamp a 1–3.

📚 Ref verificada: `src/hooks/useSleepLog.ts:49-256`

### 8.C — Lógica Pura + Tests

- `src/lib/insights.ts` (crear) — puro, sin Supabase/React, reutiliza `toNightMinutes`
  (`sleep.ts:57-64`, maneja cruce de medianoche correctamente):
  - **`collapseNights(logs, ctx)` → `NightRow[]`** (§3) — el colapsador, dueño único del merge.
  - `wakeMinutesOf(night)` → minutos nocturnos del wake real de la noche.
  - `effortBreakdown(nights)` → por `mental_effort`: media de `wakeMinutes`. **Categoría
    con 0 noches → `null`** (no dividir por cero). Retorno: `Record<MentalEffort, number | null>`.
  - `energyBreakdown(nights)` → ídem por `energy_state`.
  - `activityBreakdown(nights)` → ídem por `physical_activity`.
  - `tensionBreakdown(nights)` → ídem por `somatic_tension` (relaxed vs tense).
  - `dosesBreakdown(nights)` → media de wake para 1 / 2 / 3 dosis.
  - `buildCrossInsight(nights)` → string de **asociación** (no causa). "Mejor" = menor
    `wakeMinutes` medio. Si N < 14 → retorna el mensaje de gate, no un insight.
- `src/lib/__tests__/insights.spec.ts` (crear) — cubrir: cada breakdown; colapso de noche
  fragmentada (no doble-cuenta, usa wake de última sesión); medias en rango 04–06; suma de
  dosis por noche; **casos vacíos / N insuficiente → null / mensaje de gate**.

📚 Ref verificada: `src/lib/sleep.ts:57-64` (toNightMinutes), `src/lib/sleep.ts:270-334`
(buildDaySlots), `src/lib/__tests__/sleep.spec.ts`

### 8.D — Captura UX (skippable)

- `src/components/SleepLogger.tsx` (modificar):
  - Tras marcar bedtime, **antes** del refresh, mostrar paso intermedio (estado local
    `showDayContextPrompt`) — `handleLogBedtime` hoy llama `refreshLogs()` inmediato, hay
    que intercalar el prompt:
    ```
    ¿Cómo estuvo tu día?   (todo skippable, cada fila independiente)
    Esfuerzo:  [Menor] [Moderado] [Mayor]
    Mente:     [Aburrido] [Hiperactivo] [Exhausto] [Lúcido]
    Actividad: [Nada] [Poca] [Moderada] [Intensa]
    Cuerpo:    [Relajado] [Tenso]
    ```
  - Skippable por fila: sin toques → no se crea `day_context`; toques parciales → sólo
    esas columnas (resto NULL). Upsert si ya existe. **Cuidar fricción (§6):** 4 filas es
    el techo; si baja la adherencia al log core, recortar a Esfuerzo + Mente y dejar
    Actividad/Cuerpo en un "+ más detalle" colapsado.
  - Dosis en sesión activa: `Melatonina: [1] [2] [3]` (default 1, refleja §4). Escribe
    `melatonin_doses` sobre `activeLog`. **No** es un botón que "premia" subir — es registro
    del hecho.
- `src/components/panels/HomePanel.tsx` (modificar) — cablear refresh tras el prompt.

📚 Ref verificada: `src/components/SleepLogger.tsx:1-183`, `src/components/ProtocolSetupForm.tsx`

### 8.E — Overlay en historial

- `src/lib/sleep.ts` (modificar) — extender `DaySlot` (sleep.ts:222-237) +
  `buildDaySlots` (270-334) con `mentalEffort?`/`energyState?` (merge `day_context` por fecha).
- `src/components/SleepHistoryChart.tsx` (modificar) — bajo cada barra: chip esfuerzo
  (color) + emoji estado. **Riesgo de layout:** `DayBar` tiene altura fija (~80px) y
  `gap-1`; barras pequeñas (<5h) → chips pueden solaparse en mobile. Mostrar chips sólo si
  hay espacio (o en hover/tap), no romper el grid de 7 columnas.

📚 Ref verificada: `src/components/SleepHistoryChart.tsx:69-124`, `src/lib/sleep.ts:222-334`

### 8.F — Panel Insights

- `src/components/panels/InsightsPanel.tsx` (crear) — **tab nuevo** (decisión #6):
  1. **Vista esfuerzo↔despertar** (estrella): strip plot / dot plot con jitter (no scatter
     puro). X = `mental_effort` (0/1/2), Y = `wakeMinutes` (04 abajo-bueno … 06+ arriba),
     color = `energy_state`, tamaño/borde = `melatonin_doses`. Solo divs+Tailwind.
     **Aplica el gate N (§7):** <7 puntos crudos, 7–13 mensaje, ≥14 tendencia + disclaimer.
  2. **Breakdown cards**: medias por esfuerzo / estado / dosis (oculta o "—" si null).
  3. **Insight del cruce**: texto de `buildCrossInsight` (asociación, con disclaimer).
- **Cableado nav (4 toques, trivial):**
  - `src/components/BottomNav.tsx:6` — `ActivePanel = ... | "insights"`.
  - `src/components/BottomNav.tsx:19` — añadir item a `NAV_ITEMS` (con icono).
  - `entrypoints/popup/App.tsx:5` — `import { InsightsPanel }`.
  - `entrypoints/popup/App.tsx:70-72` — `{activePanel === "insights" && <InsightsPanel />}`.

📚 Ref verificada: `src/components/SleepHistoryChart.tsx`, `src/components/SleepStats.tsx`,
`src/components/panels/HistoryPanel.tsx:57-100`, `src/components/BottomNav.tsx:6,19`,
`entrypoints/popup/App.tsx:5,70-72`

### 8.G — Pulido

- Estados vacíos por gate N (§7): "Seguí registrando — faltan X días para ver patrones".
- Disclaimer N-of-1 fijo bajo el gráfico (patrón `CoachingCard`, ya existe).
- `npm run compile` + `npm run lint` (zero-warning) + `npm test` verdes.

📚 Ref verificada: `src/components/CoachingCard.tsx` (existe, encaja)

---

## 10. Criterios de Aceptación

- [ ] Migration 005 aplicada: `day_context` con RLS + `sleep_logs.melatonin_doses` (rango 1–3).
- [ ] `collapseNights` colapsa noches fragmentadas sin doble-contar; usa el wake de la
      última sesión; tests lo cubren.
- [ ] Captura de esfuerzo/estado es opcional (skippable) y editable (upsert) — no añade
      fricción al flujo de 1 tap.
- [ ] `npm test` cubre todos los breakdowns + casos vacíos (null / gate).
- [ ] El gráfico respeta el gate N (sin tendencia <14 días) y muestra disclaimer N-of-1.
- [ ] `buildCrossInsight` genera texto de **asociación** legible (nunca imperativo causal).
- [ ] `npm run compile` y `npm run lint` pasan.

---

## 11. Decisiones resueltas

**Usuario, 2026-06-17:**
1. Rango de despertar = 04:00–06:00. Métrica = **hora media** de despertar por categoría
   (más temprano = mejor). Sin corte binario.
2. Esfuerzo = 1 por día (`day_context` con `unique (user_id, date)`).
3. Dosis = conteo (`melatonin_doses`). Sin hora ni delay.
4. Captura del contexto = al marcar "Voy a dormir" (chips en `SleepLogger`).
5. Estado vacío hasta ~7–14 días (ver gate §7).
6. Panel Insights = tab nuevo en `BottomNav`, no sub-vista de History.

**Usuario, 2026-06-19:**
7. **El contador de dosis se queda y refleja el uso real** (3mg hipnótico, +1/hora si no
   duerme, máx 3, casi siempre 2). Es descriptivo, no normativo. Esto **corrige** el modelo
   `0.5mg cronobiótico` de `CONCEPTO.md` (ver D2).
8. Esta fase **no se construye aún** — el objetivo actual fue **mejorar la estructura del
   documento**. Codear queda para después.
9. **D1 resuelto — SÍ:** se adoptan `physical_activity` (4 niveles) y `somatic_tension`
   (binario) como dimensiones del modelo (§5). `bored_idle` se mantiene en `energy_state`;
   su causa medible la captura `physical_activity`.
10. **D2 resuelto — SÍ:** se actualiza `CONCEPTO.md` Pilar 1 a la práctica real de
    melatonina (uso hipnótico 3mg). Hecho junto con esta revisión.

## 12. Decisiones abiertas

_Ninguna._ D1 y D2 resueltas (ver §11.9–10).
