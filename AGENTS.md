# Repository (root)

## Purpose

**Lattice** is a **web app template** monorepo: **npm workspaces** + **Turborepo** (`turbo run build`, `turbo run dev`, etc.). A **Next.js** frontend under `apps/web/` is planned; the **backend** is a DDD Express app (**`@lattice/api`** under `api/`) with manual `Container` wiring, domain `Result` + `ErrorCatalog`, and root-level Jest tests (`@/` → `api/`).

## Where to look first

- **`api/`** — Application entry (`app.ts`), routes, controllers, domain, use cases, infrastructure.
- **`test/`** — Integration and unit tests; use `createTestApp()` from `test/setup.ts` for isolated apps.
- **`docs/`** — Architecture decision records (ADRs).

## Documentation files in subfolders

Each major directory contains **`AGENTS.md`**. Use that name so humans and automation can rely on a single predictable filename when opening a folder for the first time. **`README.md`** is better for human-only onboarding in libraries; here **`AGENTS.md`** doubles as developer notes and agent context.

## Conventions

- Add repository interfaces in `api/domain/repositories/`, implementations in `api/infrastructure/repositories/`.
- Register new ports on `Container` with explicit getters.
- Register domain errors in `ErrorCatalog` and map HTTP status in `HttpErrorMapper`.

## Agent prompts

- **`agents/`** — Prompt stubs + `registry.yaml` (see `agents/README.md`).
- **`.cursor/rules/*.mdc`** — Cursor **project rules**: DDD / test / infra experts **scope by folder**; debugger / code janitor attach with **`@` → Rules**. See `.cursor/rules/README.md`.
