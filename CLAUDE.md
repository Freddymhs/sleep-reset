# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server with HMR (Chrome)
npm run dev:firefox  # Dev server for Firefox
npm run build        # Production build (Chrome)
npm run build:firefox
npm run zip          # Build + zip for Chrome Web Store
npm run compile      # Type-check only (tsc --noEmit)
npm run lint         # ESLint with zero-tolerance (--max-warnings=0)
npm test             # Vitest single run
npm run test:watch   # Vitest watch mode
```

Run a single test file:
```bash
npx vitest run src/hooks/__tests__/useStorage.spec.ts
```

## Architecture

WXT-based Manifest V3 Chrome Extension with React + TypeScript + TailwindCSS. WXT generates the manifest from `wxt.config.ts` — there is no `manifest.json` in the repo.

### Extension Contexts

Three isolated browser contexts that cannot share memory:

| Context | File | Role |
|---|---|---|
| Popup UI | `entrypoints/popup/App.tsx` | React UI rendered when user clicks extension icon |
| Background | `entrypoints/background.ts` | Persistent service worker, handles messages |
| Content Script | `entrypoints/content.ts` | Runs on every web page |

### Cross-context communication

`src/utils/messaging.ts` — all inter-context messages use discriminated union types (`ExtensionMessage` / `ExtensionResponse`). Add new message types here to keep full TypeScript exhaustiveness checking at call sites.

### Persistence

`src/hooks/useStorage.ts` — generic `useStorage<T>(key, defaultValue)` hook. Wraps `chrome.storage.local` and subscribes to `onChanged` so the popup reflects updates even if it was closed. This replaces `useState` for any value that must survive popup close.

### Product concept

Sleep schedule correction app (see `CONCEPTO.md`). The planned feature set:
- Daily bedtime/wake-time logging
- Configurable sleep goal
- Gradual recommendation algorithm: max 30-min nightly shift toward goal
- 7-day history

Backend: Supabase PostgreSQL. Tables: `sleep_logs`, `sleep_goals`. Env vars needed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (store in `.env.local`, never committed).

Planned source structure (from CONCEPTO.md):
```
src/
  components/   # React UI components
  lib/          # Supabase client, business logic
  hooks/        # useStorage + domain hooks
  migrations/   # Supabase SQL migrations
```

## Key constraints

- Tests live in `src/**/__tests__/*.spec.ts(x)` — Vitest with jsdom environment, globals enabled (no need to import `describe`/`expect`).
- Lint is zero-tolerance: `--max-warnings=0`. Fix all warnings before marking work done.
- WXT modules import from `wxt/sandbox` or `#imports` — avoid direct `chrome.*` API calls where WXT provides a wrapper (`browser.*`).
