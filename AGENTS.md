# Repository (root)

## Purpose

**Lattice** is a **web app template** monorepo: **npm workspaces** + **Turborepo** (`turbo run build`, `turbo run dev`, etc.). The **Next.js** app is **`@lattice/web`** under `apps/web/` (UI under `client/` with **`@client/`** imports; **Tailwind + shadcn/ui + lucide** — see **`apps/web/docs/ui-and-styling.md`**; dev on **3001**). The **backend** is **`@lattice/api`** under `apps/api/` with manual `Container` wiring, domain `Result` + `ErrorCatalog`, and Jest API tests under **`test/api/`** (**`@api/...`** → `apps/api/...`). Web unit/E2E tests live under **`test/web/`** (Vitest + Playwright).

## Where to look first

- **`apps/api/`** — Application entry (`app.ts`), routes, controllers, domain, use cases, infrastructure.
- **`apps/web/`** — Next.js `app/` routes; feature code under `client/` (see `apps/web/AGENTS.md`).
- **`test/`** — Automated tests: **`test/api/`** (Jest), **`test/web/`** (Vitest + Playwright). See [`test/AGENTS.md`](test/AGENTS.md).
- **`config/`** — **`repo-features.json`**: CI / Dependabot toggles (see [`docs/repo-features.md`](docs/repo-features.md)).
- **Deploy** — **`npm run deploy:aws`** and **[`docs/deploy-aws.md`](docs/deploy-aws.md)** (Terraform + Lambda + static web + S3); optional GitHub Actions workflow **Deploy (AWS)**.
- **`docs/`** — Architecture decision records (ADRs).
- **`infra/terraform/`** — AWS Terraform; Supabase URL/keys from **`terraform.tfvars`** → optional **SSM** (see [`infra/AGENTS.md`](infra/AGENTS.md)).

## Documentation files in subfolders

Each major directory contains **`AGENTS.md`**. Use that name so humans and automation can rely on a single predictable filename when opening a folder for the first time. **`README.md`** is better for human-only onboarding in libraries; here **`AGENTS.md`** doubles as developer notes and agent context.

## CI parity

- **`npm run ci`** — `turbo run build lint type-check` plus **`//#test:coverage`** (Jest + coverage) and **`//#test:web:unit`** (Vitest). Matches the `test` job in `.github/workflows/ci.yml`. Playwright E2E runs in the **`web-e2e`** job; Terraform in **`terraform`**. Jobs are gated by **`config/repo-features.json`** (see **[`docs/repo-features.md`](docs/repo-features.md)**). **Dependabot** reads `.github/dependabot.yml`; use **`npm run repo-features:apply`** after toggling **`dependabot.enabled`**. Prefer **required status checks** on `main` so PRs cannot merge without green CI — update rules if you disable jobs.
- **Tests-first in Cursor** — the **Test expert** rule auto-attaches when editing `apps/api/`, `apps/web/client/`, or `apps/web/app/` (see **`agents/README.md`**). PRs use **`.github/pull_request_template.md`** to confirm tests were updated.
- **Installs** — Commit the root **`package-lock.json`** and use **`npm ci`** in CI and clean clones so dependency trees match exactly.
- **Node** — Root **`engines.node`** is **>=20.19.0**; **`.nvmrc`** pins a known-good line for local dev. CI uses **`20.19.x`** and **`22.x`** (see `.github/workflows/ci.yml`).
- **New app from template (recommended)** — Create an empty repo on GitHub, clone it next to this template, then from the template folder run **`npm run scaffold`** (see **[`docs/scaffold-workflow.md`](docs/scaffold-workflow.md)**). That copies the monorepo into your clone, runs **`fork:init`**, and preserves **`.git`**. **`npm run fork:check`** still flags template defaults if something was skipped. **`fork:init`** / **`--reset-readme`** apply renames and optional short README. **Dependabot** lives under **`.github/dependabot.yml`** (enable in the app repo’s settings if desired).

## Conventions

- Add repository interfaces in `apps/api/domain/repositories/`, implementations in `apps/api/infrastructure/repositories/`.
- Route external services (Supabase, AWS SDKs, third-party APIs) through adapters in `apps/api/infrastructure/adapters/`; repositories should depend on adapters, not SDK/client details directly.
- Register new ports on `Container` with explicit getters.
- Register domain errors in `ErrorCatalog` and map HTTP status in `HttpErrorMapper`.

## Agent prompts

- **`agents/`** — Prompt stubs + `registry.yaml` (see `agents/README.md`).
- **`.cursor/rules/*.mdc`** — Cursor **project rules**: DDD / test / infra experts **scope by folder**; debugger / code janitor attach with **`@` → Rules**. See `.cursor/rules/README.md`.
