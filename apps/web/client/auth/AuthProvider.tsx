"use client";

import { authPaths } from "@client/lib/constants/authPaths";
import { safeNextPath } from "@client/lib/safeNextPath";
import { getSupabaseClient } from "@client/lib/supabaseClient";
import { isLatticeE2eEnabled } from "@client/lib/latticeFeatureFlags";
import type { Provider, Session } from "@supabase/supabase-js";
import {
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AuthBootstrapShell } from "./AuthBootstrapShell";
import type { AuthContextValue } from "./authTypes";
import { AuthContext } from "./authTypes";
import { E2eAuthProvider } from "./E2eAuthProvider";
import { verifyAuthUsableForApi } from "./verifyAuthUsableForApi";

export function AuthProvider({ children }: { children: ReactNode }) {
  const e2eToken = isLatticeE2eEnabled()
    ? process.env.NEXT_PUBLIC_LATTICE_E2E_ACCESS_TOKEN?.trim()
    : undefined;

  if (e2eToken) {
    return <E2eAuthProvider accessToken={e2eToken}>{children}</E2eAuthProvider>;
  }

  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
}

function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiAuthAccepted, setApiAuthAccepted] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const bootstrapFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) {
      setConfigError("Supabase client auth is not configured in environment variables.");
      setLoading(false);
      setApiAuthAccepted(false);
      return;
    }

    let isMounted = true;

    bootstrapFallbackTimer.current = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 12_000);

    const clearBootstrapTimer = () => {
      if (bootstrapFallbackTimer.current) {
        clearTimeout(bootstrapFallbackTimer.current);
        bootstrapFallbackTimer.current = null;
      }
    };

    const applyVerifiedAuth = () => {
      void verifyAuthUsableForApi(supabase).then((r) => {
        if (!isMounted) {
          return;
        }
        setSession(r.session);
        setApiAuthAccepted(r.apiAuthAccepted);
        setLoading(false);
        clearBootstrapTimer();
      });
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) {
        return;
      }
      setSession(nextSession);

      if (event === "INITIAL_SESSION") {
        applyVerifiedAuth();
        return;
      }

      if (event === "SIGNED_OUT") {
        setApiAuthAccepted(false);
        setLoading(false);
        clearBootstrapTimer();
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        applyVerifiedAuth();
      }
    });

    return () => {
      isMounted = false;
      if (bootstrapFallbackTimer.current) {
        clearTimeout(bootstrapFallbackTimer.current);
      }
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    apiAuthAccepted,
    configError,
    async signInWithPassword(email, password) {
      if (!supabase) {
        return { message: "Supabase auth is not configured." };
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error;
    },
    async signUpWithPassword(email, password) {
      if (!supabase) {
        return { message: "Supabase auth is not configured." };
      }
      const { error } = await supabase.auth.signUp({ email, password });
      return error;
    },
    async requestPasswordReset(email) {
      if (!supabase) {
        return { message: "Supabase auth is not configured." };
      }
      const redirectTo = `${window.location.origin}${authPaths.resetPassword}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      return error;
    },
    async updatePassword(password) {
      if (!supabase) {
        return { message: "Supabase auth is not configured." };
      }
      const { error } = await supabase.auth.updateUser({ password });
      return error;
    },
    async signInWithOAuth(provider: Provider) {
      if (!supabase) {
        return { message: "Supabase auth is not configured." };
      }
      const redirectTo = `${window.location.origin}${authPaths.signIn}?next=${encodeURIComponent(safeNextPath(null))}`;
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      return error;
    },
    async signOut() {
      if (!supabase) {
        return;
      }
      await supabase.auth.signOut();
    },
    async getAccessToken() {
      if (!supabase) {
        return null;
      }
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
  }), [apiAuthAccepted, configError, loading, session, supabase]);

  return (
    <AuthContext.Provider value={value}>
      <AuthBootstrapShell>{children}</AuthBootstrapShell>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
