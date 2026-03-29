# Lattice

**Lattice** is a **web app template** — a monorepo starter where pieces connect cleanly: a **domain-driven design** Express API (**`@lattice/api`**), **Turborepo**, and room to grow (Next.js app, Terraform, shared packages). The name suggests a **lattice**: a structured grid linking API, UI, and infrastructure.

The **API** (`@lattice/api`) is a DDD Express app with Jest tests under **`test/api/`**. The **web** app (`@lattice/web`) is Next.js (App Router) under `apps/web/`; UI under `apps/web/client/` with the **`@client/`** alias; **Tailwind**, **shadcn/ui**, and **lucide-react** (see **`apps/web/docs/ui-and-styling.md`**); Vitest and Playwright under **`test/web/`**. The API listens on **port 3000**; the web dev server uses **3001** to avoid clashes.

## Getting Started

### Recommended: new repo + scaffold (no GitHub fork)

1. Create a **new empty repository** on GitHub (README-only is fine).
2. **Clone** it next to your local copy of this template (same parent folder).
3. From **this template** folder, run **`npm run scaffold`** into that clone, then install, test, and push.

Full steps, flags, and prompts: **[`docs/scaffold-workflow.md`](docs/scaffold-workflow.md)**.

```bash
cd /path/to/lattice-app-template
npm ci
npm run scaffold -- --into ../my-app --name my-app --repo https://github.com/your-org/my-app.git
cd ../my-app
npm ci && npm run ci
git add -A && git commit -m "Lattice scaffold" && git push -u origin main
```

You can still **fork** or **“Use this template”** on GitHub if you prefer; the scaffold command is for when org-level forks are awkward.

### Prerequisites

- Node.js **>=20.19.0** (root `package.json` → **`engines`**; use **`.nvmrc`** with **nvm** / **fnm** / **asdf** so your laptop matches CI and avoids tooling `EBADENGINE` warnings).
- npm (see **`packageManager`** in `package.json`; **`npm ci`** in CI)

### After you have an app repo (clone happy path)

Use this to validate a **machine or teammate clone** once the repo already contains the scaffold (see **[`docs/scaffold-workflow.md`](docs/scaffold-workflow.md)** or a GitHub fork/template):

```bash
git clone <your-repo-url> my-app && cd my-app
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run ci
npm run dev
```

- **`npm ci`** installs exactly what’s in the committed **`package-lock.json`** (stricter than `npm install`; use it in CI and when validating the template).
- **`npm run ci`** runs the same Turborepo pipeline as GitHub Actions (build, lint, type-check, Jest + coverage, Vitest for `test/web/unit`). If this passes on a clean clone, your fork baseline is healthy. **Playwright** E2E runs in CI’s **`web-e2e`** job (`npm run test:web:e2e`): starts **API + web**, uses a **synthetic JWT** for authenticated flows (profile + Things CRUD + auth redirect); see **`test/web/AGENTS.md`**. Install browsers once: **`npx playwright install`**.
- **GitHub**: enable **Template repository** under repo Settings if you want one-click “Use this template” forks.
- **API + Swagger:** `npm run dev` starts the API on **port 3000** and the web app on **3001**. Open **`http://localhost:3000/api-docs`** for Swagger. If you have not copied **`apps/api/.env`** yet, the API still runs using **in-memory** `Thing` storage (see [`apps/api/AGENTS.md`](apps/api/AGENTS.md)); add Supabase keys in **`.env`** when you want real persistence.

### Recommended onboarding workflow (template owner)

Use this when preparing a release of the scaffold:

1. Make scaffold/doc changes in this template repository.
2. Run local quality checks:
   - `npm ci`
   - `npm run ci`
   - `npm run infra:validate`
3. Create a fresh fork/app repository from this template.
4. In a new directory, do a clean clone of the fork and rerun:
   - `npm ci`
   - copy env files
   - `npm run ci`
   - `npm run dev`
5. Run deployment and smoke test in the **forked repo** only.

### Deployment policy (important)

- Treat this repository as the **template source**, not as a deployed environment.
- Perform test/prod deployments from forked app repositories created from this template.
- Keep cloud credentials, Supabase credentials, and environment-specific infra state out of the template repo.

### Configuration upgrade order (checklist)

Use this sequence when taking a fresh fork from local dev to deployable smoke-test state. The **full first-hour runbook** (ordered sections, **web-first smoke**, Supabase DDL, JWT-aware API checks, **checkpoint / what’s left**) is **[`docs/plans/smoke_test_deployment_guide.plan.md`](docs/plans/smoke_test_deployment_guide.plan.md)** — treat that file as canonical for deploy verification.

1. **Tooling/runtime versions**
   - Confirm Node.js **>=20.19.0** (see **`engines`** and **`.nvmrc`**).
   - Install Terraform and AWS CLI on your machine.

2. **Install and baseline checks**
   - Run `npm ci` at repo root.
   - Run `npm run ci` to verify build/lint/type-check/tests.

3. **Local app env files**
   - API: copy `apps/api/.env.example` -> `apps/api/.env`
   - Web: copy `apps/web/.env.example` -> `apps/web/.env.local`
   - Local-only values should stay in these files (never commit real secrets).

4. **External service setup (outside repo)**
   - Create Supabase project and required table(s) for API persistence.
   - Prepare AWS account/credentials for Terraform apply.
   - (Optional but recommended) enable AWS cost allocation tag `Project-<Your-Project-Name>` for budget filtering.

5. **Terraform environment config**
   - Copy `infra/terraform/envs/dev/terraform.tfvars.example` -> `infra/terraform/envs/dev/terraform.tfvars` (gitignored).
   - Fill all required values:
     - `project_name`, `environment`, `aws_region`
     - `supabase_url`, `supabase_anon_key`, `supabase_service_role_key`
   - Set optional cost controls:
     - `monthly_cost_budget_limit_usd`
     - `budget_alert_email_addresses`
     - `enable_api_schedule_controls` and schedule expressions

6. **Build deployment artifacts**
   - API Lambda bundle: `npm run api:build:lambda`
   - Static web export: `npm run web:build:static` **after** setting **`NEXT_PUBLIC_API_URL`** (and Supabase **`NEXT_PUBLIC_*`**) in the shell or `.env.production.local` to the **deployed** values (static export bakes them into `apps/web/out`).

7. **Infra validation and apply**
   - `npm run infra:validate`
   - `cd infra/terraform/envs/dev && terraform init && terraform plan && terraform apply`
   - Capture outputs: API URL, web bucket name, CloudFront domain.

8. **Publish static web assets**
   - Sync `apps/web/out` to the S3 bucket output from Terraform.

9. **Smoke test**
   - **Primary:** open the deployed web app, **log in**, exercise **Profile** and **Things** (create / edit / delete). That validates Auth, CORS, JWT verification, and API persistence together.
   - **Optional:** authenticated `curl` against `/things` with a **Bearer** token (see the smoke guide).
   - Full steps and the **checkpoint** of follow-up work: [`docs/plans/smoke_test_deployment_guide.plan.md`](docs/plans/smoke_test_deployment_guide.plan.md).

### Installation

The repo uses **npm workspaces** (`apps/api` → `@lattice/api`, `apps/web` → `@lattice/web`). From the repository root:

```bash
npm ci
```

For day-to-day iteration you can use `npm install` when you change dependencies; **`npm run install:all`** remains an alias for `npm install`.

### Environment Variables

- **API** — copy `apps/api/.env.example` → `apps/api/.env` (e.g. `PORT=3000`).
- **Web** — copy `apps/web/.env.example` → `apps/web/.env.local` (e.g. `NEXT_PUBLIC_API_URL` pointing at the API).

### Supabase Auth setup (GO / NO-GO)

Auth flow in this template uses a security-first split:

- Supabase Auth for identity in the web app (`/login`)
- Bearer token to API
- API verifies JWT and protects `/profile` + `/things`

**GO** when all items below are complete:

1. Supabase project exists and Email/Password auth is enabled.
2. At least one social provider is configured (Google recommended).
3. `apps/web/.env.local` includes:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL`
4. `apps/api/.env` includes:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - JWT verification settings (`SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_AUDIENCE`)
   - Optional legacy/test fallback: `SUPABASE_JWT_SECRET` (if you are not using JWKS)
5. Auth redirect URL includes local web origin (`http://localhost:3001`).
6. API CORS allows your web origin (`CORS_ORIGINS` in `apps/api/.env`).

If any item is missing, it is **NO-GO** for complete end-to-end login validation.
You can still run unauthenticated pages, but protected routes will return `401`.

### Running the stack

**API and web together** (Turborepo):

```bash
npm run dev
```

- API: `http://localhost:3000` (Swagger: `/api-docs`)
- Web: `http://localhost:3001`

**API only:** `npm run dev -w @lattice/api`  
**Web only:** `npm run dev -w @lattice/web`

Production build (API + web):

```bash
npm run build
```

Start API after build (web start is separate): `npm start` runs the API; for the Next app use `npm run start -w @lattice/web`.

### Running Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Architecture

- **Domain**: Entities, value objects, domain services, repository interfaces, `Result` / `ErrorCatalog`
- **Application**: Use cases and DTOs
- **Infrastructure**: Repository implementations, composition root (`Container`), optional seed/bootstrap
- **Presentation**: Express routes and controllers

Each major directory includes an `AGENTS.md` file describing purpose and conventions for contributors and automation.

## Error responses

Application use cases return structured errors mapped to HTTP status codes via `HttpErrorMapper`. Successful responses use JSON bodies; failures use:

```json
{
  "error": {
    "status": 400,
    "code": "EXAMPLE_CODE",
    "message": "Human-readable message",
    "metadata": {}
  }
}
```

## Infrastructure (Terraform + Supabase)

AWS IaC lives under **`infra/terraform/`**. Put **Supabase URL and API keys** in **`infra/terraform/envs/dev/terraform.tfvars`** (copy from `terraform.tfvars.example`; file is gitignored). With **`manage_supabase_credentials_in_ssm = true`**, Terraform writes them to **SSM Parameter Store** under `/{project}-{env}/supabase/*` for Lambdas, ECS, or CI.

**Deploying to your AWS account:** authenticate the AWS CLI (or CI via OIDC), then run Terraform from this repo — see **[Connecting your AWS account](infra/terraform/README.md#connecting-your-aws-account-for-deployment)** in **`infra/terraform/README.md`**.

```bash
npm run infra:fmt
npm run infra:validate
```

See [`infra/terraform/README.md`](infra/terraform/README.md) for `terraform init` / `apply`, remote state, and the AWS connection playbook.

## Development

```bash
npm run type-check
npm run build
```

**Same pipeline as CI** (Turborepo: build, lint, type-check, Jest with coverage, Vitest web unit):

```bash
npm run ci
```

GitHub Actions restores **`.turbo`** and **`apps/web/.next/cache`** from `actions/cache` (keyed on workspace `package.json` files and `turbo.json`). For **remote cache**, set `TURBO_TOKEN` and `TURBO_TEAM` (see [Turborepo remote caching](https://turbo.build/repo/docs/core-concepts/remote-caching)).

## Notes

- API persistence uses a repository + adapter boundary and is configured for Supabase-backed runtime behavior.
- Test suites use mocked adapters so local test runs stay deterministic and fast.

## New remote (fresh Git history)

If you created a new empty GitHub repository named `lattice-app-template`, point this clone at it and push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/lattice-app-template.git
git branch -M main
git push -u origin main
```

Use HTTPS instead of SSH if you prefer.

**After fork:** set `package.json` → **`repository.url`** to your app repo (not the template). Run **`npm run fork:check`** to list anything still at template defaults. To rebrand in one shot (root `name`, repo URL, optional **`--scope`** for `@lattice/*` packages, and copy-facing “Lattice” strings), use **`npm run fork:init -- --npm-name your-app --repo https://github.com/you/your-app.git`** (add **`--display-name`** / **`--scope`** / **`--dry-run`** as needed; see header comment in `scripts/fork.mjs`). Add **`--reset-readme`** to replace the long template **`README.md`** with a short scaffold (placeholder **`Upstream`** links to Lattice + Lattice API).

### Repo hygiene (forks and teams)

| Topic | What to do |
|--------|------------|
| **`repository.url`** | Update after fork; **`npm run fork:check`** |
| **Node** | **`engines`** + **`.nvmrc`**; CI uses **`20.19.x`** and **`22.x`** (not bare `20.x`, so patch 20.18 never slips in) |
| **Terraform providers** | **`infra/terraform/envs/dev/.terraform.lock.hcl`** is committed — re-commit after `terraform init` / provider bumps so laptops and CI match |
| **Terraform state** | Local backend is fine for solo smoke; enable the **S3 backend** in `envs/dev/versions.tf` before shared or prod work (see **`infra/terraform/README.md`**) |
| **AWS ↔ repo** | No GitHub “connect” button — use **CLI/SSO/OIDC** as in **[Connecting your AWS account](infra/terraform/README.md#connecting-your-aws-account-for-deployment)** |
| **Dependency updates** | **Dependabot** is configured (`.github/dependabot.yml`) for **npm** and **GitHub Actions** — enable “Dependabot alerts” / version updates in the fork’s GitHub settings if you want automated PRs |
| **CI vs E2E** | **`npm run ci`** matches the main workflow job; Playwright stays in the **`web-e2e`** job |
