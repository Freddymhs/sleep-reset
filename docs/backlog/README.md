# Backlog — sleep-reset

Chrome Extension (WXT + React 18 + TypeScript + TailwindCSS + Supabase OAuth).

## Fases

| Fase | Nombre | Status |
|------|--------|--------|
| FASE_0 | Base — Fundación técnica | ✅ COMPLETADA (4/4) |
| FASE_1 | Autenticación OAuth | ✅ COMPLETADA (4/4) |
| FASE_2 | Estructura del Popup | ✅ COMPLETADA (3/3) |
| FASE_3 | Sleep Logging | ✅ COMPLETADA (4/4) |
| FASE_4 | Sleep Goal (Meta) | ✅ COMPLETADA (3/3) |
| FASE_5 | Motor del Protocolo — 3 Pilares + Recomendación | ✅ COMPLETADA (5/5) |
| FASE_6 | Historial 7 días | ✅ COMPLETADA (3/3) |
| FASE_7 | Chrome Web Store | ✅ COMPLETADA (4/4) |
| FASE_8 | Esfuerzo Mental ↔ Calidad de Despertar | ⏸️ PENDIENTE (0/7) |

## 📍 Actual

FASE_8 → diseño listo en `FASE_8_ESFUERZO_MENTAL.md`. Resolver dudas abiertas antes de codear 8.A.

## ✅ MVP completado (FASE 0–7)

Reset de sueño implementado y funcionando. Pendientes manuales (no código):
- Capturas de pantalla para Chrome Web Store (requieren datos reales)
- Registrar redirect URL OAuth en Supabase al publicar con el ID de producción

## Detalle de tareas

| Fase | Tarea | Descripción | Status |
|------|-------|-------------|--------|
| FASE_1 | 1.A | useAuth hook | ✅ Completada |
| FASE_1 | 1.B | Background auth message handler | ✅ Completada |
| FASE_1 | 1.C | LoginScreen component | ✅ Completada |
| FASE_1 | 1.D | AuthGuard en App.tsx | ✅ Completada |
| FASE_2 | 2.A | App.tsx — Shell con Panel Navigation | ✅ Completada |
| FASE_2 | 2.B | BottomNav component | ✅ Completada |
| FASE_2 | 2.C | Panel placeholders (Home, History, Settings) | ✅ Completada |
| FASE_3 | 3.A | useSleepLog hook + Supabase CRUD | ✅ Completada |
| FASE_3 | 3.B | SleepLogger component | ✅ Completada |
| FASE_3 | 3.C | DailyStatus component | ✅ Completada |
| FASE_3 | 3.D | HomePanel integración | ✅ Completada |
| FASE_4 | 4.A | useSleepGoal hook (CRUD + wake anchor advance) | ✅ Completada |
| FASE_4 | 4.B | ProtocolSetupForm component | ✅ Completada |
| FASE_4 | 4.C | SettingsPanel integración | ✅ Completada |
| FASE_5 | 5.A | sleep.ts funciones puras (toNightMinutes, calcMelatoninTime…) | ✅ Completada |
| FASE_5 | 5.B | Tests unitarios (29 tests) | ✅ Completada |
| FASE_5 | 5.C | ProtocolCard component | ✅ Completada |
| FASE_5 | 5.D | LightBanner component | ✅ Completada |
| FASE_5 | 5.E | HomePanel — integración 4 bloques | ✅ Completada |
| FASE_6 | 6.A | sleep.ts — funciones de stats y buildDaySlots | ✅ Completada |
| FASE_6 | 6.B | SleepHistoryChart + SleepStats components | ✅ Completada |
| FASE_6 | 6.C | HistoryPanel integración | ✅ Completada |
| FASE_7 | 7.A | Íconos 16/32/48/128px | ✅ Completada |
| FASE_7 | 7.B | wxt.config.ts — manifest completo | ✅ Completada |
| FASE_7 | 7.C | public/privacy.html | ✅ Completada |
| FASE_7 | 7.D | Store assets (manual — requiere datos reales) | ⏳ Manual |
| FASE_8 | 8.A | Schema + tipos (migration 005 day_context + melatonin_doses) | ⏸️ Pendiente |
| FASE_8 | 8.B | Data access (useDayContext + setMelatoninDoses) | ⏸️ Pendiente |
| FASE_8 | 8.C | Lógica pura insights.ts + tests | ⏸️ Pendiente |
| FASE_8 | 8.D | Captura UX (chips esfuerzo/estado + dosis) | ⏸️ Pendiente |
| FASE_8 | 8.E | Overlay esfuerzo/estado en SleepHistoryChart | ⏸️ Pendiente |
| FASE_8 | 8.F | Panel Insights (scatter + breakdowns + cruce) | ⏸️ Pendiente |
| FASE_8 | 8.G | Pulido (recordatorio dosis, estados vacíos, lint/test) | ⏸️ Pendiente |

## Diagramas de Referencia

| Archivo | Tipo | Contenido |
|---------|------|-----------|
| `../diagrams/DIAGRAMAS_COMPONENTES.md` | Flowcharts | Topología del sistema |

Referencia estructural estable. Las fases la referencian pero no la repiten. Actualizar solo ante cambios de topología.

## Decisiones Técnicas

Carpeta `../decisions/` — documentar aquí decisiones arquitectónicas cuando surjan.
Formato: `DECISION_[TEMA].md` — explica el POR QUÉ, no el QUÉ.
