# FASE 4: Sleep Goal — Configuración del Protocolo

**Status**: ⏸️ PENDIENTE
**Prioridad**: Alta
**Dependencias**: FASE_3

## Contexto

Settings configura todo el protocolo de 3 pilares, no solo "meta de sueño".
El usuario tiene dos niveles de meta:
- **Fase A** — lo que ya logró antes (9am wake / 11pm sleep, con trabajo)
- **Fase B** — la meta ideal (6am wake / 10pm sleep)

El `current_wake_anchor` empieza igual que Fase A y avanza 20 min/semana hasta Fase B.

## Orden de ejecución

1. Tarea 4.A — useSleepGoal hook (datos antes de UI)
2. Tarea 4.B — ProtocolSetupForm component
3. Tarea 4.C — Integrar en SettingsPanel

## Tareas

### Tarea 4.A: useSleepGoal Hook

- Archivo: `src/hooks/useSleepGoal.ts` (crear)
- Qué hacer:
  1. `getGoal()` → `SELECT` la fila activa de `sleep_goals` para el usuario
  2. `saveGoal(data: Partial<SleepGoal>)` → upsert (INSERT si no existe, UPDATE si existe)
  3. `advanceWakeAnchor()` → decrementa `current_wake_anchor` en 20 min si no llegó a `target_wake_time`
     - Se llama automáticamente cada lunes al abrir el popup
     - Usa `useStorage` para recordar la última fecha en que avanzó (evitar avanzar 2 veces el mismo lunes)
  4. Retornar `{ goal: SleepGoal | null, loading, saveGoal, advanceWakeAnchor }`

### Tarea 4.B: ProtocolSetupForm Component

- Archivo: `src/components/ProtocolSetupForm.tsx` (crear)
- Qué hacer:
  1. **Sección "Tu meta final" (Fase B)**:
     - Input `type="time"` — "Quiero despertar a las" (`target_wake_time`)
     - Input `type="time"` — "Quiero dormirme a las" (`target_bedtime`)
  2. **Sección "Primera meta alcanzable (Fase A)"**:
     - Input `type="time"` — "Antes con trabajo me despertaba a las" (`phase_a_wake`)
     - Texto explicativo: "Empezamos aquí antes de ir a tu meta final"
  3. **Sección "Melatonina"**:
     - Toggle `melatonin_enabled`
     - Input numérico `melatonin_dose_mg` (default 0.5, rango 0.5–3mg, step 0.5)
     - Texto: "Se tomará ~5.5h antes de tu bedtime actual"
  4. Botón "Guardar protocolo"
  5. Pre-popular con valores actuales si `goal !== null`
  6. Feedback de éxito inline
  7. Al hacer save por primera vez: `current_wake_anchor = phase_a_wake` (empieza en Fase A)

### Tarea 4.C: Integrar en SettingsPanel

- Archivo: `src/components/panels/SettingsPanel.tsx` (modificar)
- Qué hacer:
  1. Email del usuario en la parte superior
  2. `<ProtocolSetupForm />`
  3. Sección "Progreso del protocolo":
     - Wake anchor actual: "Esta semana: despertar a las HH:MM"
     - Barra de progreso visual: fase_a_wake → target_wake_time
  4. Botón "Cerrar sesión" al fondo

## Criterios de Aceptación

- [ ] Al configurar por primera vez, `current_wake_anchor` = `phase_a_wake`
- [ ] Cada lunes, al abrir el popup, el wake anchor avanza 20 min automáticamente
- [ ] El wake anchor nunca pasa de `target_wake_time`
- [ ] El toggle de melatonina deshabilita la dosis si se apaga
- [ ] `npm run compile` y `npm run lint` pasan
