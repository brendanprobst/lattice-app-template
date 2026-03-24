# `test/` — Automated tests

## Layout

- **`test/api/`** — Jest: API integration and unit tests. See [`test/api/AGENTS.md`](api/AGENTS.md). Entry: `createTestApp()` in **`test/api/setup.ts`**.
- **`test/web/`** — Vitest unit tests and Playwright E2E for `@lattice/web`. See [`test/web/AGENTS.md`](web/AGENTS.md).

Root scripts: **`npm test`**, **`npm run test:coverage`**.
