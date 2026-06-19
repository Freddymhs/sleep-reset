# sleep-reset — Concepto v2

> v2: incorpora protocolo completo de 3 pilares basado en evidencia científica para DSPD.

## El problema real

**DSPD constitucional** (Delayed Sleep Phase Disorder) — el reloj biológico está faseado 2-3 horas más tarde que el horario social. No es falta de voluntad ni mal hábito: es fisiológico, probablemente genético, y documentado desde la infancia.

**Prueba de que es tratable:** cuando había trabajo (9am–6pm), el usuario logró consistentemente despertar a las 9-9:30am y dormirse a las 11pm. No porque el sueño "se arregló" — sino porque el trabajo aportaba los **zeitgebers** (anclajes de tiempo) que el reloj biológico necesita:
- Hora fija de despertar por obligación
- Tareas pendientes como motivación inmediata al abrir los ojos
- Estructura de alimentación (ayuno intermitente 6h window)
- Cansancio físico/mental acumulado → sueño natural a las 11pm

Sin trabajo, esos zeitgebers desaparecen y la biología recupera su fase natural (2-3am / 12pm).

**Meta declarada:** despertar a las 6am — lo que implica dormirse a las 10-11pm.

## Estrategia en dos fases

| Fase | Wake target | Sleep target | Duración estimada |
|------|-------------|--------------|-------------------|
| Fase A — Estabilizar | 9:00am | 11:00pm | 2-3 semanas |
| Fase B — Optimizar | 6:00am | 10:00pm | 4-6 semanas más |

No se salta directo a las 6am. Primero se recupera el horario que ya fue posible antes, luego se avanza.

## Protocolo de 3 Pilares

### Pilar 1 — Melatonina (uso real: hipnótico)

> **Corregido (2026-06-19).** Una versión previa de este documento describía un uso
> *cronobiótico* idealizado (0.5mg, 5.5h antes, "nunca más"). El **uso real del usuario es
> hipnótico** y es el que el producto modela y registra.

La melatonina se toma para **inducir el sueño**, ~1h antes de querer dormir:

```
dosis     = 3mg, ~1h antes del sueño deseado
si no duerme → 1 dosis adicional por hora
máximo    = 3 dosis (observado una sola vez; casi siempre 2; nunca más de 3)
```

Para el usuario esto **funciona y es valioso** — es una solución probada tras años de
intentos. El registro de dosis (`melatonin_doses`, ver modelo de datos) es **descriptivo,
no normativo**: cuenta el hecho, no juzga ni empuja a subir.

> Nota fisiológica: el uso hipnótico tardío difiere del efecto cronobiótico de avance de
> fase (dosis baja, timing temprano). El reset de fase en este proyecto se apoya
> principalmente en los Pilares 2 (luz) y 3 (wake anchor) + la regularidad; la melatonina
> aquí cumple el rol de **inductor de sueño**, no de zeitgeber.

### Pilar 2 — Protocolo de luz matutina

Dentro de los primeros 15 minutos de despertar, exposición a luz solar o brillante.
La luz es el reset más potente del reloj circadiano.

```
Al abrir el popup por primera vez del día:
  si hora_actual < wake_target + 30min:
    mostrar banner prominente: "¿Ya fuiste a la ventana? 15 min ahora"
```

### Pilar 3 — Wake anchor progresivo

Una hora de despertar fija y consistente, que avanza 15-30 min cada semana.
Es más efectivo que fijar la hora de dormir.

```
wake_anchor_esta_semana = wake_anchor_semana_pasada - 20 min
(se revisa cada lunes automáticamente)
```

La app muestra siempre cuál es el wake anchor de la semana actual.

## Modelo de datos completo

```sql
-- Registros diarios de sueño
create table sleep_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  date        date not null,
  bedtime     timestamptz,
  wake_time   timestamptz,
  source      text default 'manual',           -- 'manual' | 'apple_watch'
  notes       text,
  quality     text not null default 'normal',  -- 'normal' | 'premature'
  melatonin_doses smallint not null default 1 check (melatonin_doses between 1 and 3),
  created_at  timestamptz default now()
);
-- melatonin_doses: dosis de 3mg tomadas en esa sesión (uso hipnótico real, ver Pilar 1).
-- Default 1; rango 1-3 (casi siempre 2). Descriptivo. En noche fragmentada se suman.
-- 'premature' marca despertares forzados antes de tiempo (no pudo volver a dormir).
-- Cuenta en promedios pero se renderiza distinto en el historial.
-- Sesión activa = bedtime IS NOT NULL AND wake_time IS NULL (cualquier fecha).
-- Múltiples sesiones por día permitidas — DSPD fragmenta el sueño:
-- el usuario puede dormir de mañana (colapso) + intentar de nuevo a la noche.
-- El historial agrega las sesiones por día (suma duración, earliest bedtime,
-- latest wake) para mostrar el total real de sueño del día.

-- Meta y configuración del protocolo (una fila activa por usuario)
create table sleep_goals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  -- Metas finales
  target_wake_time    time not null,   -- ej: 06:00 (Fase B)
  target_bedtime      time not null,   -- ej: 22:00 (Fase B)
  -- Fase actual
  phase_a_wake        time not null,   -- ej: 09:00 (Fase A — probado con trabajo)
  -- Wake anchor semanal (se actualiza cada lunes)
  current_wake_anchor time not null,   -- semana actual
  -- Pilar 1: melatonina (uso hipnótico real)
  melatonin_enabled   boolean default true,
  melatonin_dose_mg   numeric(4,2) default 3.0,   -- dosis por toma (real: 3mg)
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
```

## Features MVP

- [ ] Log rápido: "Voy a dormir" / "Me desperté"
- [ ] Calcular y mostrar duración del sueño
- [ ] Pilar 1: hora de melatonina calculada dinámicamente
- [ ] Pilar 2: banner de luz matutina al abrir la extensión
- [ ] Pilar 3: wake anchor semanal visible y progresivo
- [ ] Recomendación gradual de bedtime (máx 30 min/noche)
- [ ] Historial 7 días con colores

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | Chrome Extension (WXT + React 18 + TypeScript + TailwindCSS 3) |
| Storage | Supabase (PostgreSQL + Auth OAuth Google) |
| Logic | TypeScript puro — sin dependencias para cálculos |

## Algoritmo completo

```
PASO_MAXIMO_BEDTIME = 30 min/noche

--- Pilar 1: melatonina (uso hipnótico real) ---
target_sleep = bedtime deseado de esta noche
melatonin_time = target_sleep - 1h
→ "Tomá 3mg a las HH:MM"  (+1 dosis/hora si no logra dormir, máx 3)
   Se registra melatonin_doses por sesión (descriptivo).

--- Pilar 2: luz matutina ---
on_popup_open():
  if now < wake_anchor + 30min:
    show_light_banner()

--- Pilar 3: wake anchor ---
on_monday():
  current_wake_anchor = prev_wake_anchor - 20min
  if current_wake_anchor <= phase_a_wake:
    notify("¡Llegaste a la Fase A — 9am!")

--- Bedtime recommendation ---
diff = avg_bedtime - target_bedtime
recommended_bedtime = avg_bedtime - min(diff, PASO_MAXIMO_BEDTIME)
→ "Esta noche intentá dormir a las HH:MM"
```

## Variables de entorno

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Crear `.env.local` (nunca se sube al repo).
