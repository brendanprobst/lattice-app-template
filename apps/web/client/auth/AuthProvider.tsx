"use client";

import { getSupabaseClient } from "@client/lib/supabaseClient";
import type { Provider, Session } from "@supabase/supabase-js";
import {
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthContextValue } from "./authTypes";
import { AuthContext } from "./authTypes";
import { E2eAuthProvider } from "./E2eAuthProvider";

export function AuthProvider({ children }: { children: ReactNode }) {
  const e2eToken =
    process.env.NEXT_PUBLIC_LATTICE_E2E === "1"
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
  const [configError, setConfigError] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    if (!supabase) {
      setConfigError("Supabase client auth is not configured in environment variables.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
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
    async signInWithOAuth(provider: Provider) {
      if (!supabase) {
        return { message: "Supabase auth is not configured." };
      }
      const redirectTo = `${window.location.origin}/things`;
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
  }), [configError, loading, session, supabase]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
