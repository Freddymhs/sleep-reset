# FASE 2: Estructura del Popup

**Status**: ⏸️ PENDIENTE
**Prioridad**: Alta
**Dependencias**: FASE_1

## Contexto

El popup tiene 3 paneles: Home (log + recomendación), History (7 días), Settings (meta).
La navegación es state local en App.tsx — sin router, sin hash. Paneles simples con `activePanel` state.

## Tareas

### Tarea 2.A: App.tsx — Shell con Panel Navigation

- Archivo: `entrypoints/popup/App.tsx` (modificar)
- Qué hacer:
  1. State: `const [activePanel, setActivePanel] = useState<'home' | 'history' | 'settings'>('home')`
  2. Render condicional de los 3 panels (mount todos, ocultar con `hidden` class o render condicional)
  3. Pasar `setActivePanel` a `BottomNav`
  4. Dimensiones del popup: `w-[380px] min-h-[520px]` (típico de extensiones)

### Tarea 2.B: BottomNav Component

- Archivo: `src/components/BottomNav.tsx` (crear)
- Qué hacer:
  1. 3 botones: 🏠 Home | 📅 History | ⚙️ Settings
  2. Botón activo: diferente color/peso visual con TailwindCSS
  3. Props: `active: 'home' | 'history' | 'settings'`, `onChange: (panel) => void`
  4. Posición fija al fondo del popup

### Tarea 2.C: Panel Placeholders

- Archivos:
  - `src/components/panels/HomePanel.tsx` (crear — placeholder vacío)
  - `src/components/panels/HistoryPanel.tsx` (crear — placeholder vacío)
  - `src/components/panels/SettingsPanel.tsx` (crear — placeholder vacío)
- Qué hacer: cada panel exporta un componente con su nombre centrado. Se rellenan en fases siguientes.

## Criterios de Aceptación

- [ ] Clic en cada botón del BottomNav muestra el panel correspondiente
- [ ] Dimensiones del popup son consistentes entre panels
- [ ] `npm run compile` y `npm run lint` pasan
