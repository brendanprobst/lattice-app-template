# Lattice

**Lattice** is a **web app template** — a monorepo starter where pieces connect cleanly: a **domain-driven design** Express API (**`@lattice/api`**), **Turborepo**, and room to grow (Next.js app, Terraform, shared packages). The name suggests a **lattice**: a structured grid linking API, UI, and infrastructure.

The **API** (`@lattice/api`) is a DDD Express app with Jest at the repo root. The **web** app (`@lattice/web`) is Next.js (App Router) under `apps/web/`; UI code lives under `apps/web/client/` and imports use the **`@client/`** alias. The API listens on **port 3000**; the web dev server uses **3001** to avoid clashes.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

The repo uses **npm workspaces** (`apps/api` → `@lattice/api`, `apps/web` → `@lattice/web`). Install from the repository root:

```bash
npm install
```

(`npm run install:all` is kept as an alias for the same command.)

### Environment Variables

Create a `.env` file in the `apps/api/` directory (see `apps/api/.env.example` if present):

```env
PORT=3000
```

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

**Same pipeline as CI** (Turborepo: build, lint, type-check, Jest with coverage):

```bash
npm run ci
```

GitHub Actions restores **`.turbo`** and **`apps/web/.next/cache`** from `actions/cache` (keyed on workspace `package.json` files and `turbo.json`). For **remote cache**, set `TURBO_TOKEN` and `TURBO_TEAM` (see [Turborepo remote caching](https://turbo.build/repo/docs/core-concepts/remote-caching)).

## Notes

- The template ships with in-memory repositories suitable for local development and tests; replace with real persistence adapters when you wire a database.

## New remote (fresh Git history)

If you created a new empty GitHub repository named `lattice-app-template`, point this clone at it and push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/lattice-app-template.git
git branch -M main
git push -u origin main
```

Use HTTPS instead of SSH if you prefer. Update `package.json` → `repository.url` to match your fork.
