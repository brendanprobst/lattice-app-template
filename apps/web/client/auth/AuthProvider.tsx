"use client";

import { getSupabaseClient } from "@client/lib/supabaseClient";
import {
  Provider,
  Session,
  User,
} from "@supabase/supabase-js";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configError: string | null;
  signInWithPassword(email: string, password: string): Promise<{ message: string } | null>;
  signUpWithPassword(email: string, password: string): Promise<{ message: string } | null>;
  signInWithOAuth(provider: Provider): Promise<{ message: string } | null>;
  signOut(): Promise<void>;
  getAccessToken(): Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    async signInWithOAuth(provider) {
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
