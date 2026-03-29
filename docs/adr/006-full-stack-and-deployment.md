# ADR-006: Full-Stack Layout and AWS Deployment Strategy

## Status

Accepted

## Context

The template started as a DDD Express API. It now includes a Next.js web app, Supabase-backed persistence, and AWS infrastructure for hosted validation. We need a single record of **full-stack** boundaries and **deployment** choices so forks stay consistent and future work (auth, richer web UX, CI deploy) does not contradict earlier decisions.

The **web client is intentionally thin** today: mostly default Next.js App Router structure, UI under `apps/web/client/` with a `@client/` alias, and a public env hint for API base URL. Strong product opinions (design system, data fetching libraries, auth) are deferred.

## Decision

### Monorepo and packages

- **npm workspaces** at repo root; apps live under `apps/*`.
- **`@lattice/api`**: Express API, DDD layers unchanged in spirit (see ADR-001, ADR-004, ADR-005).
- **`@lattice/web`**: Next.js (App Router). Feature UI belongs under `client/`; `app/` is routing/shell only.
- **Root Jest** targets the API with `@api/*` path mapping; web has its own lint/type-check via Turbo.

### Persistence and external services

- **Supabase (Postgres + PostgREST)** is the default persistence for the template’s example `Thing` aggregate.
- **All external service access goes through infrastructure adapters** (e.g. `ThingDataAdapter` port, `SupabaseAdapter` implementation). Repositories depend on the port, not on SDK or HTTP details (see ADR-004 updates).
- **Secrets**: Supabase URL and service role key are **server-only**. They are stored in **AWS SSM** for Lambda; never exposed to the browser or committed in real values.

### API runtime (local vs cloud)

- **Local dev**: Express via `bin/www.ts` (Node HTTP server).
- **AWS**: **AWS Lambda** runs the **same Express app** behind **@vendia/serverless-express**. **API Gateway (HTTP API)** invokes Lambda per request. This preserves route/controller/use-case parity with local dev at the cost of cold starts and bundle size discipline.

### Web hosting (AWS)

- **Next.js `output: "export"`** produces static assets under `apps/web/out/`.
- **Amazon S3** holds the static objects; **CloudFront** serves them with **Origin Access Control** (bucket is not public). SPA-style fallback routes use a **404 → index.html** custom error response for the single-page shell.

### Infrastructure as code

- **Terraform** under `infra/terraform/` defines dev-oriented resources: SSM parameters for Supabase (optional module), Lambda, API Gateway, S3, CloudFront, and **cost guardrails** (budgets, API/Lambda throttling and concurrency caps, optional EventBridge Scheduler pause/resume for the API Lambda).

### Cost and safety posture (non-prod default)

- Prefer **near-zero idle** behavior where practical: serverless API, static web, optional scheduled API pause.
- **AWS Budgets** with email notifications (after cost allocation tag activation) scoped by **`Project`** tag.
- **Explicit tradeoff**: True “free forever” hosting is not guaranteed; Supabase and AWS both have their own billing and free-tier rules.

## Consequences

### Positive

- One clone supports **local dev**, **hosted API + static web**, and **documented smoke paths** without rewriting domain logic.
- Adapter + repository split keeps **DDD boundaries** while allowing Supabase or future backends to swap behind the port.
- Terraform gives **repeatable** environments and a place to encode **guardrails** (budgets, throttling, schedules).

### Negative

- **Operational complexity**: AWS accounts, Terraform state, SSM, and Supabase projects are **external** prerequisites (see [smoke test deployment guide](../plans/smoke_test_deployment_guide.plan.md)).
- **Lambda + Express** adds cold-start and packaging considerations (esbuild bundle for Lambda).
- **Public API** today has **no auth** on `/things`; smoke tests and production both inherit that exposure until auth is added.
- **Swagger UI** at `/api-docs` is convenient for dev but is a **public documentation surface** on the deployed API unless later restricted.

## Alternatives Considered

- **AWS App Runner** (container always-on): Simpler ops for always-on APIs, but higher **baseline cost** when idle; kept as a documented upgrade path, not the default low-idle track.
- **Per-route Lambda handlers**: Best cold-start granularity; rejected for the **initial** template to avoid rewriting Express routing and to keep local/cloud parity.
- **Next.js SSR on Lambda / container**: Richer web story; deferred to keep web hosting **static-only** and simple for early forks.
- **Encore / other platform**: Strong DX for cloud-native services; rejected as **default** to avoid locking the template to a non-standard runtime and a large migration from the existing Express DDD layout.

## Related documents

- [Terraform README — AWS account connection for deployment](../../infra/terraform/README.md#connecting-your-aws-account-for-deployment)
- [ADR-001: DDD Architecture](./001-ddd-architecture.md)
- [ADR-004: Repository Pattern](./004-repository-pattern.md) (persistence and testing)
- [Smoke test deployment guide](../plans/smoke_test_deployment_guide.plan.md)
- [Zero-cost-first E2E plan](../plans/zero-cost-first_e2e_deployment_plan_cd815a81.plan.md)

## Notes on future web work

When the web app gains opinions (auth, React Query, shared API client, design system), prefer:

- Keeping **server secrets** out of `NEXT_PUBLIC_*` vars.
- Calling the **same versioned HTTP API** the smoke test uses, rather than embedding Supabase anon keys for server-owned workflows unless deliberately building a BFF-less client-direct model with RLS.
