# `test/` — Automated tests

## Tests-first workflow (with Cursor)

The **Test expert** Cursor rule applies when you edit **`test/**`** *or* feature code under **`apps/api/`**, **`apps/web/client/`**, **`apps/web/app/`** — see **`.cursor/rules/test-expert.mdc`**. New behavior in those trees should include matching **Jest** / **Vitest** / **Playwright** updates in the same change. See **`agents/README.md`** (Tests-first feature work) and **`.github/pull_request_template.md`**.

## Layout

- **`test/api/`** — Jest: API integration and unit tests. See [`test/api/AGENTS.md`](api/AGENTS.md). Entry: `createTestApp()` in **`test/api/setup.ts`**.
- **`test/web/`** — Vitest unit tests and Playwright E2E for `@lattice/web`. See [`test/web/AGENTS.md`](web/AGENTS.md).

Root scripts: **`npm test`**, **`npm run test:coverage`**.
