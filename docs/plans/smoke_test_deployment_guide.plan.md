---
name: Smoke test and deployment guide
overview: First-hour fork → deploy runbook for Lattice (Lambda API + static web). Web app is the primary smoke example; API CRUD requires a Bearer JWT. Includes security notes, correct Supabase DDL, and a checkpoint of doc vs later work.
todos:
  - id: implement-smoke-script
    content: Add scripts/smoke (API_BASE_URL + BEARER_TOKEN) for CRUD/assertions; no secret logging
    status: pending
  - id: optional-deploy-workflow
    content: Optional GitHub Actions deploy + smoke with OIDC; mask outputs; no echo of keys
    status: pending
isProject: false
---

# Smoke test deployment guide (reusable)

This document is the **canonical runbook** for the first end-to-end deploy and smoke test after you fork the template. **Treat the web app as the example:** confirm login, profile, and Things in the browser against deployed URLs before you invest in scripted API checks.

Keep it in-repo so every fork repeats the same steps safely.

---

## Checkpoint — reference this when we say “what’s left”

Use this section to track **this documentation pass** vs **follow-up work** (no code changes required here unless noted).

### Addressed in the doc checkpoint (you are here)

- **`apps/web/.env.example`** — tracked example env for `NEXT_PUBLIC_*` variables (fork “happy path” matches README).
- **This guide** — aligned with **JWT-protected** `/things` and `/profile`, **numeric `things.id`**, and **web-first** smoke.
- **First-hour checklist** — consolidated below (was scattered across README bullets).
- **README / infra pointers** — smoke step and build-time env callouts updated to point here.
- **CI E2E** — Playwright starts **API + web** with a **synthetic JWT** (no live Supabase); covers profile, Things CRUD, and auth redirects — see **`test/web/AGENTS.md`** (differs from deployed smoke only in env URLs and real login).

### Still to do later (not part of this doc checkpoint)

| Item | Notes |
|------|--------|
| **`scripts/smoke/`** (optional) | For deployed HTTPS smoke only: `API_BASE_URL` + `BEARER_TOKEN`. Local/CI already cover stack behavior with **Playwright** (`test/web/AGENTS.md`). |
| Optional **deploy + smoke** GitHub workflow | OIDC / masked secrets; see § *CI vs manual smoke*. |
| **Swagger** hardening for public stacks | Disable or protect `/api-docs` when you care about enumeration. |
| **`morgan`** mode in Lambda | Consider `combined` or structured logging vs `dev` verbosity. |
| **Commit `infra/terraform/envs/dev/.terraform.lock.hcl`** | After `terraform init`, for provider parity (see `infra/terraform/README.md`). |
| **`package.json` → `repository.url`** | Update after fork (template placeholder). |

---

## First hour — fork → deploy → verify (~ordered checklist)

Goal: from a clean clone of **your fork**, reach a **known-good deployed smoke** without improvising env wiring.

**Time budget:** about an hour if AWS, Supabase, and Terraform are already familiar; otherwise treat this as a single sitting checklist, not a stopwatch.

### A. Machine and repo (≈10 min)

1. **Node.js** — `20.19+` (matches `package.json` `engines` and CI).
2. **Clone your fork** (not the upstream template, if you treat that as read-only source).
3. **`npm ci`** at repo root (uses committed `package-lock.json`).
4. **`npm run ci`** — same pipeline as GitHub Actions `test` job (build, lint, type-check, API Jest + coverage, web Vitest). Fix failures before deploying.

### B. Configure apps (local reference only; real secrets stay gitignored) (≈10 min)

1. **API** — `cp apps/api/.env.example apps/api/.env`  
   Fill Supabase **service role**, URL, **`SUPABASE_JWT_ISSUER`** / **`SUPABASE_JWT_AUDIENCE`** (and optional **`SUPABASE_JWT_SECRET`** for HS256 tests). Set **`CORS_ORIGINS`** to every browser origin that will call the API (comma-separated, no wildcards in the template default).

2. **Web** — `cp apps/web/.env.example apps/web/.env.local`  
   Set **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, **`NEXT_PUBLIC_API_URL`**.  
   **Local dev:** API base is usually `http://localhost:3000` (web on `3001`).

3. **Supabase dashboard (Auth)**  
   Under **Authentication → URL configuration**, add redirect URLs for **local** (`http://localhost:3001`, `http://127.0.0.1:3001`) and, after you know it, your **CloudFront HTTPS origin**. Without this, OAuth / email redirects fail mysteriously.

### C. Supabase database (≈5 min)

The API maps rows to **`ThingRecord`**: numeric **`id`**, **`name`**, **`created_at`**. The template **creates Things with an app-generated integer `id`** (see `CreateThingUseCase`), not a database serial — the column must accept explicit inserts.

Run in **SQL Editor**:

```sql
create table if not exists public.things (
  id bigint primary key,
  name text not null,
  created_at timestamptz not null
);
```

**RLS:** The API uses the **service role** against PostgREST. For a minimal dev/smoke stack you may leave RLS off or add policies consistent with service-role access. Tighten before real production data.

### D. Terraform and build (≈15–25 min)

> **You perform `terraform apply` and AWS uploads yourself** — this guide does not automate deploy in CI today.

1. `cp infra/terraform/envs/dev/terraform.tfvars.example infra/terraform/envs/dev/terraform.tfvars` and fill required variables (see `infra/terraform/README.md`).
2. **`npm run api:build:lambda`** — Lambda bundle path must exist before apply (per tfvars).
3. **Web static export — critical:** set **`NEXT_PUBLIC_API_URL`** (and Supabase **`NEXT_PUBLIC_*`**) to the **deployed** API and project values **before**:

   ```bash
   npm run web:build:static
   ```

   Static export bakes public env into `apps/web/out`; localhost URLs in that build will hit the wrong host from end users’ browsers.

4. `cd infra/terraform/envs/dev && terraform init && terraform plan && terraform apply`
5. Capture outputs: `api_url`, `web_bucket_name`, `web_cloudfront_domain`.
6. **`aws s3 sync`**: upload `apps/web/out` to the web bucket (`--delete` if you want a clean bucket).

### E. Post-deploy wiring (≈5 min)

1. **CORS** — Lambda/API env must list your **production static site origin** (e.g. `https://d1234567890.cloudfront.net` or your custom domain). Redeploy or update env if needed.
2. **JWT env on Lambda** — Issuer/audience (or JWKS behavior) must match the **same** Supabase project as the web anon key.
3. **Supabase Auth URLs** — Add the **HTTPS web URL** you actually open in the browser.

### F. Smoke — web first (≈5–10 min) **← primary**

1. Open **`https://<web_cloudfront_domain>/`** (or your domain).
2. **Login** (email/password or configured social provider).
3. **Profile** — loads `/profile` (or `/me` via API) with your JWT.
4. **Things** — create, edit, delete; confirm list updates (uses TanStack Query + Bearer calls).

If this passes, your fork’s **public path** is validated end-to-end.

### G. Smoke — API with curl (optional, for operators)

Protected routes return **401** without a valid **Supabase access token**.

1. Obtain a **JWT** (e.g. sign in via the web app and copy the session access token from devtools **only for local debugging**, or use Supabase tooling — never commit tokens or paste them into tickets).
2. Set env (minimal surface in shell history):

   ```bash
   export API_BASE_URL="$(cd infra/terraform/envs/dev && terraform output -raw api_url)"
   export BEARER_TOKEN="<paste-short-lived-access-token>"
   ```

3. Example sequence:

   ```bash
   curl -sS -X POST "$API_BASE_URL/things" \
     -H 'Content-Type: application/json' \
     -H "Authorization: Bearer $BEARER_TOKEN" \
     -d '{"name":"smoke-test"}'

   curl -sS "$API_BASE_URL/things" -H "Authorization: Bearer $BEARER_TOKEN"
   ```

Parse **`id`** from JSON for `GET/PUT/DELETE` by id. **Do not log** full tokens or service-role keys.

**Automated script (future):** `scripts/smoke/` should implement the same flow with **`API_BASE_URL` + `BEARER_TOKEN`**, assert status codes and shape, exit non-zero on failure.

**Unauthenticated `/things`:** Expect **401** — that is correct for this template.

---

## Architecture reminder

- **API**: API Gateway (HTTP API) → **Lambda** → **Express** (`@vendia/serverless-express`) → **Supabase** (PostgREST) via **service role** (server-only, never in the browser). **Browser → API** calls send **Bearer** JWTs; middleware verifies JWT.
- **Web**: Next.js **static export** → **S3** + **CloudFront**; **Supabase Auth** in the browser with the **anon** key.
- **Secrets**: Supabase URL + service role often live in **SSM** when `manage_supabase_credentials_in_ssm = true`; Lambda reads **parameter names** from env.

---

## Security review (code janitor + smoke context)

Aligned with `.cursor/rules/code-janitor.mdc`: no credentials in repo, minimal leak surface, call out footguns.

### What the smoke test should do (safe pattern)

- Prefer **web-first** checks (no token handling in shell).
- For API-only checks: call **HTTPS** `api_url`; send **Bearer** user JWT for `/things` and `/profile`. **Do not** pass service role keys to the browser or into curl on shared machines without care.
- **Do not** put secrets in query strings or path segments.
- **Do not** `console.log` full `process.env` or raw upstream error bodies in CI.

### What must not appear in logs or screenshots

- Service role key, AWS keys, `terraform.tfvars` contents, long-lived JWTs.
- Prefer asserting **status + minimal JSON shape** over dumping bodies.

### Runtime surfaces to be aware of

- **`/api-docs` (Swagger UI)** — Public on the API origin unless you gate it. Fine for dev/sandbox; reconsider for internet-facing prod.
- **Express error JSON** — `stack` only when `NODE_ENV === 'development'`. Lambda uses **`NODE_ENV=production`** in Terraform.
- **`morgan` `dev`** — Request lines in CloudWatch; avoid putting secrets in URLs.
- **GitHub Actions** — Use encrypted secrets; never `echo` credentials; mask derived tokens if needed.

### Budget and tagging

- Cost allocation tag **`Project`** must match `project_name` in tfvars if you rely on budget filters; activate the tag in AWS Billing.

---

## External steps (outside the repo)

### AWS account

- Billing tolerance for the test; **AWS CLI** creds for Terraform.
- **Cost allocation tag `Project`** if using budget alerts; confirm Budgets email subscribers.

### Terraform variables

- `terraform.tfvars` gitignored; copy from `terraform.tfvars.example`.

### Build artifacts (not committed)

- Lambda: `npm run api:build:lambda`
- Web: `npm run web:build:static` **with production `NEXT_PUBLIC_*` already set**

---

## Commands: deploy (from repo root) — reference

```bash
cd /path/to/repo
npm ci
npm run api:build:lambda
npm run web:build:static

cd infra/terraform/envs/dev
terraform init
terraform plan
terraform apply
```

Outputs:

```bash
terraform output -raw api_url
terraform output -raw web_bucket_name
terraform output -raw web_cloudfront_domain
```

Upload static site:

```bash
aws s3 sync /path/to/repo/apps/web/out "s3://$(cd /path/to/repo/infra/terraform/envs/dev && terraform output -raw web_bucket_name)" --delete
```

---

## Commands: teardown or cost pause

**Full teardown:**

```bash
cd infra/terraform/envs/dev
terraform destroy
```

**Pause API only** (if `enable_api_schedule_controls = true`): EventBridge schedules adjust Lambda concurrency; verify in AWS Console.

---

## CI vs manual smoke

- **`.github/workflows/ci.yml`** does **not** deploy or call live AWS (avoids accidental spend and secret exposure).
- A future **deploy + smoke** workflow should use **OIDC** or short-lived keys, masked outputs, and optionally the future `scripts/smoke/` runner with a throwaway test user token.

---

## Related docs

- [README.md](../../README.md) — fork workflow, `npm run ci`, env files.
- [ADR-006: Full-stack and deployment](../adr/006-full-stack-and-deployment.md)
- [infra/terraform/README.md](../../infra/terraform/README.md)
- [docs/plans/zero-cost-first_e2e_deployment_plan_cd815a81.plan.md](./zero-cost-first_e2e_deployment_plan_cd815a81.plan.md)

---

## Changelog for this guide

- **Doc checkpoint:** Web-first smoke; JWT + numeric `things` DDL; `apps/web/.env.example`; first-hour checklist; checkpoint vs deferred work; removed obsolete unauthenticated `/things` instructions.
- Initial version: security review + deploy + teardown; Lambda `NODE_ENV=production` documented.
