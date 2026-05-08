/**
 * Supabase client — singleton for the extension.
 *
 * Requires .env.local with:
 *   VITE_SUPABASE_URL=<your-project-url>
 *   VITE_SUPABASE_ANON_KEY=<your-anon-key>
 *
 * Both values are injected at build time by Vite (via WXT).
 * Never commit .env.local to the repo.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "[sleep-reset] Missing Supabase env vars. " +
      "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local",
  );
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    /**
     * Use localStorage-based storage compatible with the extension popup context.
     * Background service workers cannot use localStorage — wire a custom storage
     * adapter (chrome.storage.local) when Supabase auth is needed in background.ts.
     */
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
