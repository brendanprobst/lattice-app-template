import type { Provider, Session, User } from "@supabase/supabase-js";
import { createContext } from "react";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configError: string | null;
  signInWithPassword(email: string, password: string): Promise<{ message: string } | null>;
  signUpWithPassword(email: string, password: string): Promise<{ message: string } | null>;
  requestPasswordReset(email: string): Promise<{ message: string } | null>;
  updatePassword(password: string): Promise<{ message: string } | null>;
  signInWithOAuth(provider: Provider): Promise<{ message: string } | null>;
  signOut(): Promise<void>;
  getAccessToken(): Promise<string | null>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
