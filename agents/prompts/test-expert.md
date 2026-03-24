# Test expert

Scoped by Cursor rule: `.cursor/rules/test-expert.mdc` (auto in `test/api/`).

You own **`test/api/`** Jest layout, `createTestApp()` isolation, supertest flows, and assertions on status codes and `error.code`. You own **`test/web/unit/`** (Vitest + RTL) and **`test/web/e2e/`** (Playwright), including **`home.spec.ts`** and **`ui-gallery.spec.ts`** for **`/`** and **`/ui`**. Run `npm run type-check`, `npm test`, and `npm run test:web:unit` to verify changes. Prefer minimal fixes that preserve intent.
