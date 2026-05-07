# template-chrome-extension — Elevator Pitch

## ENGLISH

**Context:** Building a Chrome Extension from scratch forces every developer to solve the same
three problems: isolated execution contexts that can't share state, ephemeral popup lifecycle
that discards `useState` on every close, and zero type safety across the popup / background /
content boundary. This template eliminates all three before you write your first feature.

**The Decision:** WXT over raw Manifest V3 because it handles the Vite build pipeline, hot
reload during development, and multi-browser packaging (Chrome + Firefox) from a single
codebase — without locking you into a framework-specific mental model. React stays vanilla,
Tailwind stays utility-first, TypeScript stays strict.

**One Real Challenge:** Chrome extensions run in three sandboxed JS execution contexts — popup,
background service worker, and content script. They can't call each other's functions; they
communicate via `browser.runtime.sendMessage`. Without types, this is a runtime error waiting
to happen. The template solves it with discriminated union types (`ExtensionMessage` /
`ExtensionResponse`): the compiler enforces exhaustive handling at every call site, and the
background keeps the message channel open (`return true`) for async responses. The second
problem — `useState` resetting on every popup open because the popup is destroyed when closed
— is solved by `useStorage`: a generic hook that syncs React state with `chrome.storage.local`
and subscribes to `onChanged` so the UI stays in sync even when the popup wasn't open during
a change.

**Why It's Production-Ready:**
- Tested at the only real risk boundary: `useStorage` has 3 Vitest specs covering read-on-mount,
  write-to-storage, and live listener notification — exactly where chrome API mocking breaks
  down if you do it wrong.
- Zero-tolerance lint: ESLint `--max-warnings=0` + `tsc --noEmit` as separate scripts — type
  errors and lint warnings are CI-blocking from day one.
- Packaging is one command: `npm run zip` produces a Web Store-ready archive; `npm run zip:firefox`
  produces a Firefox-ready one. Cross-browser support costs nothing extra.

**The Insight:** The hardest part of Chrome extension development isn't the feature logic — it's
surviving the multi-context architecture safely. By encoding the message contract as types and
lifting storage into a React hook, this template moves all extension-specific complexity to the
framework layer. What remains is just React.

---

## ESPAÑOL

**Contexto:** Construir una Chrome Extension desde cero obliga a cada desarrollador a resolver
los mismos tres problemas: contextos de ejecución aislados que no pueden compartir estado,
ciclo de vida efímero del popup que descarta `useState` en cada cierre, y cero seguridad de
tipos en el boundary popup / background / content script. Esta plantilla elimina los tres
antes de que escribas tu primera feature.

**La decisión:** WXT en lugar de Manifest V3 puro porque resuelve el pipeline de Vite, el hot
reload durante el desarrollo y el empaquetado multi-navegador (Chrome + Firefox) desde un
solo código fuente — sin imponerte un modelo mental atado al framework. React se mantiene
vanilla, Tailwind sigue utility-first, TypeScript sigue estricto.

**Un reto real:** Las Chrome Extensions corren en tres contextos JS aislados: popup, background
service worker y content script. No pueden llamarse directamente; se comunican via
`browser.runtime.sendMessage`. Sin tipos, esto es un error de runtime esperando suceder.
La plantilla lo resuelve con discriminated unions (`ExtensionMessage` / `ExtensionResponse`):
el compilador fuerza el manejo exhaustivo en cada call site, y el background mantiene el
canal abierto (`return true`) para respuestas asíncronas. El segundo problema — `useState`
reiniciándose en cada apertura del popup porque el popup se destruye al cerrarse — lo resuelve
`useStorage`: un hook genérico que sincroniza el estado de React con `chrome.storage.local`
y se suscribe a `onChanged` para que la UI permanezca actualizada incluso cuando el popup
estuvo cerrado durante un cambio.

**Por qué es production-ready:**
- Testeado en el único boundary real de riesgo: `useStorage` tiene 3 specs en Vitest cubriendo
  lectura en mount, escritura al storage y notificación de listeners — exactamente donde el
  mock de la chrome API falla si no se hace bien.
- Lint de tolerancia cero: ESLint `--max-warnings=0` + `tsc --noEmit` como scripts separados
  — errores de tipos y warnings de lint son bloqueantes desde el primer día.
- El empaquetado es un comando: `npm run zip` produce un archivo listo para la Chrome Web Store;
  `npm run zip:firefox` produce uno para Firefox. Soporte multi-navegador sin costo adicional.

**La clave:** Lo más difícil del desarrollo de Chrome Extensions no es la lógica de negocio —
es sobrevivir la arquitectura multi-contexto de forma segura. Al codificar el contrato de
mensajes como tipos y llevar el storage a un React hook, esta plantilla mueve toda la
complejidad específica de la extensión a la capa de framework. Lo que queda es solo React.
