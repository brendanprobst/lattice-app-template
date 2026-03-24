# `test/web/` — Web unit (Vitest) and E2E (Playwright)

## Unit tests (`test/web/unit/`)

- **Runner:** Vitest + jsdom + React Testing Library.
- **Config:** [`vitest.config.ts`](vitest.config.ts) — `@client/*` → `apps/web/client/*`.
- **Setup:** [`vitest.setup.ts`](vitest.setup.ts) — `jest-dom` matchers, `next/image` mock.
- **Run:** `npm run test:web:unit` (repo root).

## E2E (`test/web/e2e/`)

- **Runner:** Playwright (Chromium in CI).
- **Config:** [`playwright.config.ts`](playwright.config.ts) — starts `npm run dev -w @lattice/web` on **3001**, sets `NEXT_PUBLIC_API_URL` for stable assertions.
- **Specs:** `home.spec.ts` (Lattice home), `ui-gallery.spec.ts` (`/ui` component gallery landmarks).
- **Run:** `npm run test:web:e2e` (install browsers once: `npx playwright install`).

## CI

- Unit tests run in the main **`npm run ci`** pipeline via Turbo.
- E2E runs in a separate workflow job (browser install + Playwright).
