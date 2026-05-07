# FASE 0: Base — Fundación Técnica

**Status**: ⏸️ PENDIENTE
**Prioridad**: Alta
**Dependencias**: ninguna

## Orden de ejecución

1. Tarea 0.A — SQL migration (define el schema antes de crear el cliente)
2. Tarea 0.B — Types TypeScript (deriva tipos del schema)
3. Tarea 0.C — Supabase client (usa los tipos definidos en 0.B)
4. Tarea 0.D — useStorage hook extension (independiente, base del popup)

## Tareas

### Tarea 0.A: SQL Migration — schema completo con RLS

- Archivo: `supabase/migrations/001_sleep_tables.sql` (crear)
- Qué hacer:
  1. Tabla `sleep_logs`:
     - `id uuid PK`, `user_id uuid FK auth.users`, `date date`, `bedtime timestamptz`, `wake_time timestamptz`, `source text default 'manual'`, `notes text`, `created_at timestamptz`
     - Índice en `(user_id, date)` para queries de historial
  2. Tabla `sleep_goals` (protocolo completo):
     - `id uuid PK`, `user_id uuid FK auth.users`
     - `target_wake_time time NOT NULL` — meta final (ej: 06:00, Fase B)
     - `target_bedtime time NOT NULL` — meta final (ej: 22:00, Fase B)
     - `phase_a_wake time NOT NULL` — primera meta alcanzable (ej: 09:00 — probado antes)
     - `current_wake_anchor time NOT NULL` — wake anchor semana actual
     - `melatonin_enabled boolean default true`
     - `melatonin_dose_mg numeric(4,2) default 0.5`
     - `created_at timestamptz`, `updated_at timestamptz default now()`
  3. Habilitar RLS en ambas tablas
  4. Policies: `select/insert/update/delete` solo para `auth.uid() = user_id`
- Referencia: `CONCEPTO.md` sección Schema

### Tarea 0.B: Tipos TypeScript

- Archivo: `src/lib/types.ts` (crear)
- Qué hacer:
  1. Interface `SleepLog` (refleja tabla sleep_logs)
  2. Interface `SleepGoal` (refleja tabla sleep_goals con todos los campos del protocolo)
  3. Interface `Recommendation`:
     ```ts
     interface Recommendation {
       suggestedBedtime: string        // 'HH:MM'
       minutesFromGoal: number
       melatoninTime: string           // 'HH:MM' — cuándo tomar melatonina
       wakeAnchor: string             // 'HH:MM' — wake anchor semana actual
       showLightBanner: boolean       // true si hay que mostrar banner de luz
     }
     ```
  4. Type `SleepSource = 'manual' | 'apple_watch'`
- Sin `any`, sin types opcionales donde no aplica

### Tarea 0.C: Supabase Client

- Archivo: `src/lib/supabase.ts` (crear)
- Qué hacer:
  1. Crear cliente con `createClient(url, anonKey)` desde `import.meta.env`
  2. Exportar como `supabase` (singleton)
  3. Verificar que `.env.local` está en `.gitignore`

### Tarea 0.D: useStorage Hook Base

- Archivo: `src/hooks/useStorage.ts` (crear)
- Qué hacer:
  1. Hook genérico `useStorage<T>(key: string, defaultValue: T)`
  2. Wrappea `chrome.storage.local` — get en mount, set en setter
  3. Suscribe a `chrome.storage.onChanged` para reflejar cambios externos
  4. Retorna `[value, setValue]` al estilo `useState`

## Criterios de Aceptación

- [ ] `npm run compile` pasa sin errores
- [ ] `npm run lint` pasa con 0 warnings
- [ ] `.env.local` no está en git
- [ ] Migration SQL tiene RLS + policies + índice `(user_id, date)`
- [ ] `SleepGoal` type incluye todos los campos del protocolo de 3 pilares
