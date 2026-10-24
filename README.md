🤖 Proyecto asistido por IA — NO se contabiliza en CV/resume (no es práctica manual real).

# template-chrome-extension

Chrome Extension template built with WXT + React + TypeScript + TailwindCSS.

## Stack

- **Framework:** [WXT](https://wxt.dev) (Vite-based, Manifest V3)
- **UI:** React 18 + TypeScript + TailwindCSS 3
- **Tests:** Vitest + jsdom

## Structure

```
entrypoints/
  popup/          → React UI shown when clicking the extension icon
  background/     → Service worker (event listeners, background logic)
  content/        → Script injected into web pages
src/
  hooks/          → useStorage — chrome.storage synced state
  utils/          → messaging — type-safe popup ↔ background ↔ content messages
  styles/         → Tailwind globals
```

## Quick start

```bash
npm install
npm run dev        # opens Chrome with extension hot-reloaded
npm run build      # production build → dist/chrome-mv3/
npm run zip        # packages extension for Chrome Web Store
```

## How to add a new feature

### New popup page
Add a folder under `entrypoints/` with `index.html` + `main.tsx` — WXT auto-discovers it.

### New content script
```ts
// entrypoints/my-script/index.ts
export default defineContentScript({
  matches: ["*://example.com/*"],
  main() { /* ... */ },
});
```

### Persist state across popup opens
```ts
const [value, setValue] = useStorage("my-key", defaultValue);
```

### Send messages between scripts
```ts
import { sendMessage } from "@/utils/messaging";
const response = await sendMessage({ type: "PING" });
```

## Key concepts

| Concept | File | Why |
|---|---|---|
| Popup UI | `entrypoints/popup/App.tsx` | React component rendered in the extension popup |
| Persistent state | `src/hooks/useStorage.ts` | `useState` resets on popup close — `chrome.storage` persists |
| Background logic | `entrypoints/background/index.ts` | Service worker — survives page navigation |
| Page injection | `entrypoints/content/index.ts` | Reads/modifies the active tab's DOM |
| Type-safe messages | `src/utils/messaging.ts` | Prevents runtime errors between scripts |

## Run tests

```bash
npm test
```