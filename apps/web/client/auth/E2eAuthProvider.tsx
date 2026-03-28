"use client";

import type { Provider, Session } from "@supabase/supabase-js";
import { ReactNode, useEffect, useMemo, useState } from "react";
import type { AuthContextValue } from "./authTypes";
import { AuthContext } from "./authTypes";
import { buildE2eSession } from "./e2eSession";

const SIGNED_OUT_KEY = "lattice-e2e-signed-out";

/**
 * Playwright-only path: synthetic Supabase-shaped session from a pre-minted JWT.
 * Enabled only when `NEXT_PUBLIC_LATTICE_E2E=1` (see `test/web/playwright.config.ts`).
 *
 * Signed-out state is stored in `sessionStorage` so a full navigation after `signOut`
 * does not immediately rebuild a session from env (Playwright auth-guard tests).
 */
export function E2eAuthProvider({ accessToken, children }: { accessToken: string; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SIGNED_OUT_KEY) === "1") {
      setSession(null);
    } else {
      setSession(buildE2eSession(accessToken));
    }
    setReady(true);
  }, [accessToken]);

  const loading = !ready;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      configError: null,
      async signInWithPassword() {
        return { message: "E2E mode uses a synthetic session." };
      },
      async signUpWithPassword() {
        return { message: "E2E mode uses a synthetic session." };
      },
      async signInWithOAuth(_provider: Provider) {
        return { message: "E2E mode uses a synthetic session." };
      },
      async signOut() {
        sessionStorage.setItem(SIGNED_OUT_KEY, "1");
        setSession(null);
      },
      async getAccessToken() {
        return session?.access_token ?? null;
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
