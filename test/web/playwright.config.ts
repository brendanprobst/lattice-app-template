import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { createE2eAccessToken } from "./e2e/support/createE2eAccessToken";
import { E2E_JWT_ISSUER, E2E_JWT_SECRET } from "./e2e/support/e2eAuthConstants";

/** Repo root when tests are started via `npm run test:web:e2e` from the monorepo root. */
const repoRoot = process.cwd();
const e2eToken = createE2eAccessToken();

/**
 * One stack for all E2E: API (in-memory Things + HS256 JWT) + Next.js (synthetic E2E session).
 * Auth-guard tests sign out first, then assert redirects (see `auth-guard.spec.ts`).
 */
export default defineConfig({
  testDir: path.join(repoRoot, "test/web/e2e"),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev -w @lattice/api",
      cwd: repoRoot,
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: "3000",
        // Force in-memory Things repo (see `Container`): do not inherit a dev machine's Supabase from `.env`.
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        SUPABASE_JWT_SECRET: E2E_JWT_SECRET,
        SUPABASE_JWT_ISSUER: E2E_JWT_ISSUER,
        SUPABASE_JWT_AUDIENCE: "authenticated",
        CORS_ORIGINS: "http://127.0.0.1:3001,http://localhost:3001",
      },
    },
    {
      command: "npm run dev -w @lattice/web",
      cwd: repoRoot,
      url: "http://127.0.0.1:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: "http://127.0.0.1:3000",
        NEXT_PUBLIC_LATTICE_E2E: "1",
        NEXT_PUBLIC_LATTICE_E2E_ACCESS_TOKEN: e2eToken,
      },
    },
  ],
});
