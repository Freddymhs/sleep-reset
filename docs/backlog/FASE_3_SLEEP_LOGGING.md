# FASE 3: Sleep Logging

**Status**: ⏸️ PENDIENTE
**Prioridad**: Alta
**Dependencias**: FASE_2

## Orden de ejecución

1. Tarea 3.A — useSleepLog hook (datos antes de UI)
2. Tarea 3.B — SleepLogger component
3. Tarea 3.C — DailyStatus component
4. Tarea 3.D — Integrar en HomePanel

## Tareas

### Tarea 3.A: useSleepLog Hook

- Archivo: `src/hooks/useSleepLog.ts` (crear)
- Qué hacer:
  1. `logBedtime()` → `INSERT` en `sleep_logs` con `{ date: today, bedtime: now(), user_id }`
     - Si ya existe registro para hoy → `UPDATE` bedtime
  2. `logWakeTime()` → `UPDATE` wake_time en el registro del día actual
  3. `getTodayLog()` → `SELECT` el registro de hoy (puede ser null si no se logueó nada)
  4. `getRecentLogs(days: number)` → últimos N días ordenados por date DESC
  5. Tipos de retorno: `SleepLog | null` y `SleepLog[]`
  6. Manejar errores con throw (no silenciar)
- `user_id` viene de `supabase.auth.getUser()` internamente

### Tarea 3.B: SleepLogger Component

- Archivo: `src/components/SleepLogger.tsx` (crear)
- Qué hacer:
  1. Botón "Voy a dormir 🌙" → llama `logBedtime()`
  2. Botón "Me desperté ☀️" → llama `logWakeTime()`
  3. Estado visual: si `bedtime` ya está logueado hoy → botón 1 deshabilitado y muestra hora
  4. Si `wake_time` ya está logueado hoy → botón 2 deshabilitado y muestra hora
  5. Estado `loading` durante la operación → deshabilitar ambos botones
  6. Error → mensaje inline bajo los botones

### Tarea 3.C: DailyStatus Component

- Archivo: `src/components/DailyStatus.tsx` (crear)
- Qué hacer:
  1. Recibe `log: SleepLog | null`
  2. Si null → "Aún no registraste nada hoy"
  3. Si tiene bedtime pero no wake_time → "Dormiste a las HH:MM · despertando..."
  4. Si tiene ambos → "Dormiste HHh MMm" (duración calculada)
  5. Cálculo de duración en `src/lib/sleep.ts` (función `calcDuration(bedtime, wakeTime): string`)

### Tarea 3.D: Integrar en HomePanel

- Archivo: `src/components/panels/HomePanel.tsx` (modificar)
- Qué hacer:
  1. Usar `useSleepLog` para obtener `todayLog` y las funciones de log
  2. Render: `<DailyStatus log={todayLog} />` + `<SleepLogger ... />`
  3. Refresh automático después de cada log exitoso

## Criterios de Aceptación

- [ ] "Voy a dormir" guarda bedtime en Supabase con el user_id del usuario autenticado
- [ ] "Me desperté" guarda wake_time
- [ ] DailyStatus muestra la duración correcta (ej: 7h 30m)
- [ ] Si ya se registró hoy, los botones muestran la hora guardada
- [ ] RLS de Supabase impide ver/editar logs de otro usuario
- [ ] `npm run compile` y `npm run lint` pasan
