/**
 * useAuth — Session management for Chrome Extension MV3 + Supabase OAuth.
 *
 * OAuth flow: chrome.identity.launchWebAuthFlow (system popup, no redirect pages).
 * Session is stored in chrome.storage.local via useStorage for persistence across
 * popup closes.
 *
 * NOTE: chrome.identity is only available in popup and background contexts, not
 * content scripts.
 */

import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { STORAGE_KEYS } from "../lib/constants";

const STORAGE_KEY = STORAGE_KEYS.SUPABASE_SESSION;

/** Extracts URL search params from a URL's hash fragment. */
function parseFragment(url: string): URLSearchParams {
  const hashIndex = url.indexOf("#");
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
  return new URLSearchParams(fragment);
}

export interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On mount: restore persisted session and subscribe to future auth changes
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      // 1. Try restoring cached session from chrome.storage.local
      const stored = await browser.storage.local.get(STORAGE_KEY);
      const cachedSession = stored[STORAGE_KEY] as Session | undefined;

      if (cachedSession && isMounted) {
        // Restore session into Supabase client so it can refresh tokens
        const { data, error: setErr } = await supabase.auth.setSession({
          access_token: cachedSession.access_token,
          refresh_token: cachedSession.refresh_token,
        });
        if (!setErr && data.session && isMounted) {
          setSession(data.session);
        }
      }

      // 2. Fallback: ask Supabase for current session (may be undefined in MV3)
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    };

    initSession().catch(() => {
      if (isMounted) setLoading(false);
    });

    // Subscribe to auth state changes (token refresh, sign-out from other context)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      if (!isMounted) return;
      setSession(updatedSession);
      // Keep chrome.storage.local in sync
      if (updatedSession) {
        browser.storage.local.set({ [STORAGE_KEY]: updatedSession });
      } else {
        browser.storage.local.remove(STORAGE_KEY);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const redirectTo = chrome.identity.getRedirectURL();

      // 1. Get Supabase OAuth URL (skipBrowserRedirect prevents auto-navigation)
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (oauthError || !data.url) {
        throw oauthError ?? new Error("No OAuth URL returned by Supabase");
      }

      // 2. Open system OAuth popup and wait for the redirect URL
      const redirectedUrl: string = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          { url: data.url, interactive: true },
          (responseUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (!responseUrl) {
              reject(new Error("OAuth popup closed without completing sign-in"));
            } else {
              resolve(responseUrl);
            }
          },
        );
      });

      // 3. Extract tokens from hash fragment
      const params = parseFragment(redirectedUrl);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        throw new Error("Missing tokens in OAuth redirect fragment");
      }

      // 4. Hydrate Supabase client with the received tokens
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

      if (sessionError) throw sessionError;

      const newSession = sessionData.session;
      setSession(newSession);
      if (newSession) {
        browser.storage.local.set({ [STORAGE_KEY]: newSession });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await supabase.auth.signOut();
      await browser.storage.local.remove(STORAGE_KEY);
      setSession(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cerrar sesión";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { session, loading, error, signInWithGoogle, signOut };
}
