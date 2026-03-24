# `test/` — Automated tests

## Layout

- **`test/api/`** — Jest: API integration and unit tests. See [`test/api/AGENTS.md`](api/AGENTS.md). Entry: `createTestApp()` in **`test/api/setup.ts`**.
- **`test/web/`** — (Planned) Vitest unit + Playwright E2E for `@lattice/web`.

Root scripts: **`npm test`**, **`npm run test:coverage`**.
