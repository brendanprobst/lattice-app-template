import type { Session, User } from "@supabase/supabase-js";

/**
 * Browser-safe JWT payload decode (no verification — token is minted by Playwright for E2E only).
 * Enabled only when `NEXT_PUBLIC_LATTICE_E2E=1` and `NEXT_PUBLIC_LATTICE_E2E_ACCESS_TOKEN` is set.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return {};
    }
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function buildE2eSession(accessToken: string): Session {
  const payload = decodeJwtPayload(accessToken);
  const sub = typeof payload.sub === "string" ? payload.sub : "e2e-user";
  const email = typeof payload.email === "string" ? payload.email : "e2e@example.com";
  const exp = typeof payload.exp === "number" ? payload.exp : Math.floor(Date.now() / 1000) + 3600;

  const user = {
    id: sub,
    aud: "authenticated",
    role: "authenticated",
    email,
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as User;

  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    refresh_token: "e2e",
    user,
  };
}
