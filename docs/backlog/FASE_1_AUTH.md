# FASE 1: Autenticación OAuth

**Status**: ✅ COMPLETADA (4/4)
**Prioridad**: Alta
**Dependencias**: FASE_0

## Contexto

Chrome Extension MV3 + Supabase OAuth tiene una restricción: no puede usar redirect URLs normales.
El flujo correcto es `chrome.identity.launchWebAuthFlow` que abre un popup del sistema y captura el redirect.
El `redirect_to` debe ser `chrome.identity.getRedirectURL()` (ej: `https://<extension-id>.chromiumapp.org/`).
Supabase lo soporta con `signInWithOAuth({ provider, options: { redirectTo } })` — pero hay que usar la URL del token manualmente porque el popup no puede hacer el exchange automático.

## Orden de ejecución

1. Tarea 1.A — useAuth hook (lógica de session y login/logout)
2. Tarea 1.B — Background: message handler para auth
3. Tarea 1.C — LoginScreen component
4. Tarea 1.D — AuthGuard en App.tsx

## Tareas

### Tarea 1.A: useAuth Hook

- Archivo: `src/hooks/useAuth.ts` (crear)
- Qué hacer:
  1. Función `signInWithGoogle()` que:
     a. Llama `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: chrome.identity.getRedirectURL(), skipBrowserRedirect: true } })`
     b. Usa la `url` devuelta para llamar `chrome.identity.launchWebAuthFlow({ url, interactive: true })`
     c. Del redirect capturado extrae el fragment (`#access_token=...&refresh_token=...`)
     d. Llama `supabase.auth.setSession({ access_token, refresh_token })`
  2. Función `signOut()` que llama `supabase.auth.signOut()`
  3. Estado: `session` (Session | null), `loading` (boolean)
  4. En mount: `supabase.auth.getSession()` para recuperar sesión persistida
  5. Suscribir a `supabase.auth.onAuthStateChange` para mantener estado sincronizado
- Usar `useStorage` para cachear la sesión en `chrome.storage.local` bajo key `'supabase_session'`

### Tarea 1.B: Background — Auth Message Handler

- Archivo: `entrypoints/background.ts` (modificar)
- Qué hacer:
  1. Agregar handler para mensaje `{ type: 'AUTH_SIGN_OUT' }` que llame `supabase.auth.signOut()`
  2. El popup puede enviar este mensaje para invalidar la sesión desde el service worker
  3. Mantener el handler existente de `PING`
- Nota: `chrome.identity` solo funciona en contextos con acceso a `chrome.*` — el popup lo tiene.

### Tarea 1.C: LoginScreen Component

- Archivo: `src/components/LoginScreen.tsx` (crear)
- Qué hacer:
  1. Botón "Continuar con Google" que llama `signInWithGoogle()`
  2. Estado `loading` → mostrar spinner / deshabilitar botón
  3. Estado `error` → mostrar mensaje inline (no toast)
  4. Logo o ícono del producto centrado
  5. No usar librerías de UI externas — solo TailwindCSS

### Tarea 1.D: AuthGuard en App.tsx

- Archivo: `entrypoints/popup/App.tsx` (crear/modificar)
- Qué hacer:
  1. Si `loading` → spinner centrado
  2. Si `session === null` → `<LoginScreen />`
  3. Si `session` → render del popup principal (panels)
  4. Pasar `session.user` a los panels que lo necesiten

## Criterios de Aceptación

- [x] Login con Google abre popup del sistema y cierra al completar
- [x] Sesión persiste al cerrar y reabrir el popup
- [x] `signOut()` limpia sesión en Supabase y en storage local
- [x] Sin sesión → siempre muestra LoginScreen (no hay datos expuestos)
- [x] `npm run compile` y `npm run lint` pasan
