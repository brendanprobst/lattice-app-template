import type { Session, SupabaseClient } from "@supabase/supabase-js";

export type VerifyAuthUsableForApiResult = {
  session: Session | null;
  /**
   * True when Supabase Auth accepted the JWT (`getUser()` succeeded).
   * Use this for UX that must match credentialed API calls — not `getSession()` alone,
   * which only reads browser storage and can stay non-null after refresh/expiry.
   */
  apiAuthAccepted: boolean;
};

/**
 * Reconcile browser auth state with Supabase Auth server validation.
 *
 * Prefer this over `getSession()` alone when deciding whether the user can actually
 * call your API with a Bearer token (stale storage is common after deploys / clock skew / revoked refresh).
 */
export async function verifyAuthUsableForApi(
  supabase: SupabaseClient,
): Promise<VerifyAuthUsableForApiResult> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      const { data: { session } } = await supabase.auth.getSession();
      const s = session ?? null;
      return { session: s, apiAuthAccepted: Boolean(s?.user) };
    }

    const { data: { session: stale } } = await supabase.auth.getSession();
    if (stale) {
      await supabase.auth.signOut({ scope: "local" });
    }
    return { session: null, apiAuthAccepted: false };
  } catch {
    const { data: { session } } = await supabase.auth.getSession();
    return { session: session ?? null, apiAuthAccepted: false };
  }
}
