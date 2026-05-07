# FASE 6: Historial 7 Días

**Status**: ⏸️ PENDIENTE
**Prioridad**: Media
**Dependencias**: FASE_5

## Tareas

### Tarea 6.A: SleepHistoryChart Component

- Archivo: `src/components/SleepHistoryChart.tsx` (crear)
- Qué hacer:
  1. Recibe `logs: SleepLog[]` (últimos 7 días, puede tener huecos)
  2. Por cada día de los últimos 7 (incluyendo los sin registro):
     - Muestra la fecha abreviada (Lun, Mar, etc.)
     - Barra o indicador visual de duración del sueño
     - Color según calidad: verde ≥ 7h, amarillo 5-7h, rojo < 5h, gris = sin datos
  3. Sin librerías de charts — implementar con divs y TailwindCSS (barras simples)
  4. Tooltip o subtexto al hover/tap con bedtime y wake_time

### Tarea 6.B: SleepStats Component

- Archivo: `src/components/SleepStats.tsx` (crear)
- Qué hacer:
  1. Recibe `logs: SleepLog[]`
  2. Mostrar: promedio de duración de la semana, día con más sueño, racha (días consecutivos con registro)
  3. Solo calcular con días que tienen tanto bedtime como wake_time
  4. Funciones de cálculo: agregar a `src/lib/sleep.ts`

### Tarea 6.C: Integrar en HistoryPanel

- Archivo: `src/components/panels/HistoryPanel.tsx` (modificar)
- Qué hacer:
  1. Llamar `useSleepLog().getRecentLogs(7)` al mount
  2. Estado `loading` → skeleton de 7 barras grises
  3. Render: `<SleepStats />` arriba + `<SleepHistoryChart />` abajo

## Criterios de Aceptación

- [ ] Los 7 días siempre se muestran (días sin datos = barra gris)
- [ ] Colores reflejan duración correctamente
- [ ] Promedio semanal es correcto (solo días con datos completos)
- [ ] `npm run compile` y `npm run lint` pasan
