import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Repo root when tests are started via `npm run test:web:e2e` from the monorepo root. */
const repoRoot = process.cwd();

export default defineConfig({
  testDir: path.join(repoRoot, 'test/web/e2e'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -w @lattice/web',
    cwd: repoRoot,
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3000',
    },
  },
});
