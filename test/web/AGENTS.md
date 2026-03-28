# `test/web/` — Web unit (Vitest) and E2E (Playwright)

## Unit tests (`test/web/unit/`)

- **Runner:** Vitest + jsdom + React Testing Library.
- **Config:** [`vitest.config.ts`](vitest.config.ts) — `@client/*` → `apps/web/client/*`.
- **Setup:** [`vitest.setup.ts`](vitest.setup.ts) — `jest-dom` matchers, `next/image` mock.
- **Run:** `npm run test:web:unit` (repo root).

## E2E (`test/web/e2e/`)

- **Runner:** Playwright (Chromium in CI).
- **Config:** [`playwright.config.ts`](playwright.config.ts) starts **two** dev servers:
  - **`@lattice/api`** on **3000** — in-memory Things + HS256 JWT (`test/web/e2e/support/e2eAuthConstants.ts`).
  - **`@lattice/web`** on **3001** — `NEXT_PUBLIC_LATTICE_E2E=1` and a pre-minted `NEXT_PUBLIC_LATTICE_E2E_ACCESS_TOKEN` (synthetic session; no real Supabase).
- **Specs**
  - **`auth-guard.spec.ts`** — signs out, then asserts `/things` and `/profile` redirect to `/login` (same as manual “logged out” behavior).
  - **`full-stack.spec.ts`** — profile claims + Things CRUD (matches manual smoke minus real Supabase login UI).
  - **`home.spec.ts`**, **`ui-gallery.spec.ts`** — public routes.
- **Run:** `npm run test:web:e2e` (install browsers once: `npx playwright install`).
- **Port conflicts:** if `3000` / `3001` are already in use, stop other dev servers or set `CI=true` so Playwright does not reuse an existing process.

## CI

- Unit tests run in the main **`npm run ci`** pipeline via Turbo.
- E2E runs in a separate workflow job (browser install + Playwright).
