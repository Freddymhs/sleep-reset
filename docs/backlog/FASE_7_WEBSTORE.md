# FASE 7: Chrome Web Store

**Status**: ⏸️ PENDIENTE
**Prioridad**: Baja
**Dependencias**: FASE_6

## Tareas

### Tarea 7.A: Íconos de la Extensión

- Archivos: `public/icons/icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png` (crear)
- Qué hacer:
  1. Diseñar ícono temático (luna + reloj o similar)
  2. WXT los toma de `public/icons/` automáticamente si siguen la convención de nombres
  3. Verificar que `wxt.config.ts` no tenga overrides de icons que los ignoren

### Tarea 7.B: Metadata del Manifest

- Archivo: `wxt.config.ts` (modificar)
- Qué hacer:
  1. Agregar `name`, `description`, `version` si no están
  2. Agregar permisos necesarios: `storage`, `identity`
  3. Agregar `oauth2` si se requiere para `chrome.identity` con Google
  4. `host_permissions`: `https://*.supabase.co/*`
  5. Verificar que `action.default_popup` apunte al popup correcto

### Tarea 7.C: Build y Validación

- Comandos a verificar:
  1. `npm run build` → sin errores
  2. `npm run zip` → genera el .zip para subir a Web Store
  3. Cargar el zip en Chrome (`chrome://extensions` → "Load unpacked" sobre el dist/chrome-mv3/) y probar flujo completo
  4. Verificar que OAuth funciona con la extensión instalada (el redirect URL cambia con el ID real)

### Tarea 7.D: Assets para Web Store

- Archivos a preparar (fuera del repo o en `docs/store-assets/`):
  1. Screenshot 1280x800 del popup en uso
  2. Descripción corta (≤ 132 chars) y larga (≤ 132 chars short + larga)
  3. Categoría: Productivity
  4. Privacy policy URL (requerido si hay auth — puede ser un Notion público)

## Criterios de Aceptación

- [ ] `npm run zip` genera un .zip válido
- [ ] Extensión instalada desde .zip funciona en Chrome (login, log, recomendación)
- [ ] OAuth redirect URL registrado en Supabase como `https://<prod-extension-id>.chromiumapp.org/`
- [ ] Íconos correctos en todas las resoluciones
