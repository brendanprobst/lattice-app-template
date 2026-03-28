/**
 * Shared with Playwright (Node) and documented for API `webServer` env.
 * API verifies HS256 when `SUPABASE_JWT_SECRET` is set — must match the token
 * minted for the web app’s synthetic E2E session.
 */
export const E2E_JWT_SECRET = "lattice-playwright-e2e-secret";
export const E2E_JWT_ISSUER = "https://e2e.local.supabase/auth/v1";
export const E2E_USER_ID = "e2e-playwright-user";
export const E2E_USER_EMAIL = "e2e-playwright@example.com";
