# `test/` — Tests

## Imports

From tests, import the API with the **`@api/`** alias (maps to `apps/api/` via root `tsconfig.json` and Jest `moduleNameMapper`). Example: `import { X } from '@api/domain/...'`.

## Layout

- **`setup.ts`** — `createTestApp()` with a fresh `Container` and seed/bootstrap as required.
- **Integration tests** — Name `*.test.ts`; hit HTTP with `supertest`.
- **`utils/`** — Unit tests for `Result`, mappers, handlers.

## Isolation

Prefer a **new container per test file or `beforeEach`** so tests do not share in-memory state.
