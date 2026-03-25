# Lattice

**Lattice** is a **web app template** — a monorepo starter where pieces connect cleanly: a **domain-driven design** Express API (**`@lattice/api`**), **Turborepo**, and room to grow (Next.js app, Terraform, shared packages). The name suggests a **lattice**: a structured grid linking API, UI, and infrastructure.

The **API** (`@lattice/api`) is a DDD Express app with Jest tests under **`test/api/`**. The **web** app (`@lattice/web`) is Next.js (App Router) under `apps/web/`; UI under `apps/web/client/` with the **`@client/`** alias; **Tailwind**, **shadcn/ui**, and **lucide-react** (see **`apps/web/docs/ui-and-styling.md`**); Vitest and Playwright under **`test/web/`**. The API listens on **port 3000**; the web dev server uses **3001** to avoid clashes.

## Getting Started

This template is designed for a **fork-first workflow**:

1. Improve scaffold/docs in this template repo.
2. Fork (or use as a GitHub Template) to create an app repo.
3. Validate from a clean clone locally.
4. Deploy and smoke test the **forked app repo**, not this template repo.

### Prerequisites

- Node.js **20.19+** (see `package.json` `engines`; CI tests **20.x** and **22.x**)
- npm

### First clone or fork (happy path)

Use this to mimic a fresh machine and catch drift before you rely on the template:

```bash
git clone <your-repo-url> my-app && cd my-app
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run ci
npm run dev
```

- **`npm ci`** installs exactly what’s in the committed **`package-lock.json`** (stricter than `npm install`; use it in CI and when validating the template).
- **`npm run ci`** runs the same Turborepo pipeline as GitHub Actions (build, lint, type-check, Jest + coverage, Vitest for `test/web/unit`). If this passes on a clean clone, your fork baseline is healthy. **Playwright** E2E runs in CI’s **`web-e2e`** job; locally run **`npm run test:web:e2e`** (after **`npx playwright install`** once).
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

Use this sequence when taking a fresh fork from local dev to deployable smoke-test state.

1. **Tooling/runtime versions**
   - Confirm Node.js version matches `package.json` engines (`20.19+`).
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
   - Static web export: `npm run web:build:static`

7. **Infra validation and apply**
   - `npm run infra:validate`
   - `cd infra/terraform/envs/dev && terraform init && terraform plan && terraform apply`
   - Capture outputs: API URL, web bucket name, CloudFront domain.

8. **Publish static web assets**
   - Sync `apps/web/out` to the S3 bucket output from Terraform.

9. **Smoke test**
   - Run CRUD against API URL (`POST/GET/PUT/DELETE /things`) and verify expected responses.
   - Use the deployment smoke guide for full command flow: `docs/plans/smoke_test_deployment_guide.plan.md`.

### Installation

The repo uses **npm workspaces** (`apps/api` → `@lattice/api`, `apps/web` → `@lattice/web`). From the repository root:

```bash
npm ci
```

For day-to-day iteration you can use `npm install` when you change dependencies; **`npm run install:all`** remains an alias for `npm install`.

### Environment Variables

- **API** — copy `apps/api/.env.example` → `apps/api/.env` (e.g. `PORT=3000`).
- **Web** — copy `apps/web/.env.example` → `apps/web/.env.local` (e.g. `NEXT_PUBLIC_API_URL` pointing at the API).

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

```bash
npm run infra:fmt
npm run infra:validate
```

See [`infra/terraform/README.md`](infra/terraform/README.md) for `terraform init` / `apply` and remote state.

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

Use HTTPS instead of SSH if you prefer. Update `package.json` → `repository.url` to match your fork.
