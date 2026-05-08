/**
 * WXT global type stubs for standalone `tsc --noEmit`.
 *
 * WXT injects these globals at build/dev time via virtual modules.
 * This file makes them visible to the TypeScript compiler when running
 * outside of WXT (e.g. `npm run compile`).
 *
 * Full generated types (routes, i18n keys) are produced by `wxt prepare`
 * in .wxt/ and are not duplicated here.
 */

import type { WxtBrowser } from "wxt/browser/chrome";

declare global {
  /** WXT browser API — equivalent to `chrome` when extensionApi is 'chrome'. */
  const browser: WxtBrowser;

  /** Defines a background service worker entrypoint. */
  function defineBackground(main: () => void): void;
  function defineBackground(definition: { main: () => void; [key: string]: unknown }): void;

  /** Defines a content script entrypoint. */
  function defineContentScript(definition: {
    matches: string[];
    main: () => void;
    [key: string]: unknown;
  }): void;
}
