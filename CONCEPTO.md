# sleep-reset

## Problema

Desplazamiento progresivo del horario de sueño: dormirse cada vez más tarde (2am, 3am, 4am) y despertar al mediodía, lo que elimina la mañana productiva. Los intentos bruscos de corrección (no dormir toda la noche) fallan porque el cuerpo colapsa y se duerme igual hasta tarde.

## Solución

Chrome Extension que actúa como diario de sueño + coach gradual:

1. **Log rápido**: un click para registrar "me voy a dormir" y "me desperté"
2. **Meta**: configurar horario objetivo (ej: dormir 11pm, despertar 7am)
3. **Recomendación gradual**: en lugar de un salto brutal, el sistema dice "esta noche intenta dormir a las 1:45am" — ajuste de 15-30 min por día hasta llegar a la meta
4. **Historial visual**: últimos 7 días con colores para ver el progreso real

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | Chrome Extension (WXT + React 18 + TypeScript + TailwindCSS 3) |
| Storage | Supabase (PostgreSQL) |
| Logic | TypeScript puro — sin dependencias de terceros para cálculos |

## Features MVP

- [ ] Registrar hora de dormir (bedtime)
- [ ] Registrar hora de despertar (wake time)
- [ ] Ver duración de sueño del día
- [ ] Configurar meta (target_bedtime, target_wake_time)
- [ ] Recomendación gradual noche a noche
- [ ] Historial últimos 7 días

## Algoritmo de recomendación gradual

```
PASO_MAXIMO = 30 minutos

1. Calcular promedio de bedtime de los últimos 3 días
2. Calcular diferencia entre promedio y target_bedtime
3. Si diferencia > PASO_MAXIMO:
     recomendacion = promedio - PASO_MAXIMO
   Sino:
     recomendacion = target_bedtime
4. Mostrar: "Esta noche intenta dormir a las {recomendacion}"
```

**Ejemplo concreto:**
- Promedio últimos 3 días: 2:30am
- Meta: 11:00pm (23:00)
- Diferencia: 3h30m → mayor que 30 min
- Recomendación: 2:00am → mañana 1:30am → ... → eventual 11:00pm

## Schema Supabase

```sql
-- Registros diarios de sueño
create table sleep_logs (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  bedtime     timestamptz,
  wake_time   timestamptz,
  source      text default 'manual',  -- 'manual' | 'apple_watch'
  notes       text,
  created_at  timestamptz default now()
);

-- Meta del usuario (una sola fila activa)
create table sleep_goals (
  id                uuid primary key default gen_random_uuid(),
  target_wake_time  time not null,
  target_bedtime    time not null,
  created_at        timestamptz default now()
);
```

## Roadmap

### Fase 1 — MVP (actual)
- Chrome Extension con log manual
- Supabase como storage
- Recomendación gradual

### Fase 2 — Apple Watch
- Apple Health exporta datos via iOS Shortcuts
- Shortcuts hace POST a Supabase REST API
- La columna `source = 'apple_watch'` ya está preparada en el schema
- Sin cambios de schema requeridos

## Estructura del proyecto

```
sleep-reset/
  entrypoints/
    popup/
      App.tsx          ← router entre vistas: Home | History | Settings
      index.html
      main.tsx
  src/
    components/
      SleepLogger.tsx    ← botones "Voy a dormir" / "Me desperté"
      DailyStatus.tsx    ← duración y calidad del sueño de hoy
      Recommendation.tsx ← "Esta noche duerme a las HH:MM"
      ProgressBar.tsx    ← avance hacia meta
    lib/
      supabase.ts        ← cliente Supabase
      sleep.ts           ← cálculos: duración, recomendación, streak
      types.ts           ← SleepLog, SleepGoal, Recommendation
    hooks/
      useSleepLog.ts     ← queries a Supabase
      useSleepGoal.ts
  supabase/
    migrations/
      001_sleep_tables.sql
```

## Variables de entorno

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Crear `.env.local` (no se sube al repo, está en `.gitignore`).
