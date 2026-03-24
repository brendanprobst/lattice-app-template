---
name: Smoke test and deployment guide
overview: Reusable checklist to deploy the Lattice serverless stack (API on Lambda + static web on S3/CloudFront), run a safe public CRUD smoke test without leaking secrets, and tear down or pause when done. Includes a code-janitor-style security review of smoke-test and runtime surfaces.
todos:
  - id: implement-smoke-script
    content: Add scripts/smoke/public-api-crud.mjs (or .ts) that reads API_BASE_URL only and performs CRUD; no secret logging
    status: pending
  - id: optional-deploy-workflow
    content: Optional GitHub Actions workflow with OIDC or repo secrets; mask outputs; no echo of keys
    status: pending
isProject: false
---

# Smoke test deployment guide (reusable)

This document is the **canonical runbook** for a first end-to-end deploy and smoke test. Keep it in-repo so every fork can repeat the same steps safely.

## Architecture reminder

- **API**: API Gateway (HTTP API) → **Lambda** → **Express** (`@vendia/serverless-express`) → **Supabase** (PostgREST) via **service role** (server-only, never in the browser).
- **Web**: Next.js **static export** → **S3** + **CloudFront**.
- **Secrets**: Supabase URL + service role key live in **SSM** (when `manage_supabase_credentials_in_ssm = true`); Lambda reads them at cold start using **parameter names** in env (not values in Terraform state for those names only—values still exist in SSM and in Terraform state if parameters are managed by Terraform).

---

## Security review (code janitor + smoke context)

Aligned with `.cursor/rules/code-janitor.mdc`: no credentials in repo, minimal leak surface, call out footguns.

### What the smoke test should do (safe pattern)

- Call only the **public API base URL** from Terraform output `api_url` (API Gateway), over **HTTPS**.
- Use **unauthenticated** `POST/GET/PUT/DELETE` to `/things` as the template exposes today (no API key). That matches production exposure: anyone who knows the URL can hit the same routes until you add auth.
- **Do not** pass Supabase keys, AWS keys, or SSM paths as query parameters or URL segments.
- **Do not** `console.log` full `process.env` or error objects from fetch responses if the API ever returns raw upstream bodies (today domain errors are structured; unexpected errors return generic 500 JSON).

### What the smoke test must not log (CI or local)

- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` if ever injected locally for non-Lambda runs.
- AWS access keys, session tokens, or `terraform.tfvars` contents.
- Full HTTP response dumps in CI unless scrubbed (prefer asserting status + shape only).

### Runtime surfaces to be aware of

- **`/api-docs` (Swagger UI)** — Public API documentation on the same origin as your API. Accept for dev; for production consider disabling or protecting (not yet in template).
- **Express error JSON** — Stack traces: `app.ts` only adds `stack` when `NODE_ENV === 'development'`. Lambda sets **`NODE_ENV=production`** in Terraform.
- **`ResponseHandler.handleError`** — Logs message + stack to CloudWatch (expected for ops); client still gets generic 500 JSON. Do not echo server logs into smoke output.
- **`morgan` `dev`** — Logs request lines to CloudWatch (paths/methods/status); avoid putting secrets in URLs.
- **GitHub Actions** — Store `AWS_*` and any future tokens as **encrypted secrets**; never `echo` them; use `::add-mask::` for derived tokens if needed.

### Budget and tagging

- Monthly budget filter uses cost allocation tag **`Project`** (must match `project_name` in `terraform.tfvars` and **Cost allocation tags** enabled in AWS Billing for that tag). Complete this once per AWS account (external console step below).

---

## External steps (you must do outside the repo)

### 1) AWS account

- Create or use an AWS account with billing alerts acceptable for your test.
- Install and configure **AWS CLI** with credentials that can run Terraform (`IAM` user/role with appropriate policies, or use **AWS SSO** / **OIDC** in CI later).
- **Enable cost allocation tag** for `Project` (if you use budget alerts):
  - AWS Console → **Billing** → **Cost allocation tags** → activate tag key **`Project`**.
- Confirm **Budgets** email subscribers (AWS sends confirmation emails).

### 2) Supabase project

- Create a Supabase project.
- In **SQL Editor**, create the `things` table expected by the API (columns match `ThingRecord` / repository):

```sql
create table if not exists public.things (
  id text primary key,
  name text not null,
  created_at timestamptz not null
);
```

- **Row Level Security**: the API uses the **service role** key against PostgREST. For a minimal template, you may leave RLS off for this table in dev or add policies that allow the `service_role` path your deployment uses. Lock down before any production workload.
- Copy **Project URL**, **anon** key (optional for web later), and **service_role** key from **Project Settings → API**. Never commit the service role key.

### 3) Terraform variables (local file, gitignored)

- Copy `infra/terraform/envs/dev/terraform.tfvars.example` → `terraform.tfvars`.
- Fill `project_name`, `environment`, `aws_region`, all `supabase_*` values, and `budget_alert_email_addresses` if using budgets.
- Optional: set `enable_api_schedule_controls = true` and adjust pause/resume cron expressions for your timezone (`api_schedule_timezone`).

### 4) Build artifacts (not committed)

- Lambda zip inputs: run `npm run api:build:lambda` so `apps/api/dist-lambda/index.js` exists before `terraform apply` (path is wired via `api_lambda_bundle_path`).
- Web static assets: run `npm run web:build:static` so `apps/web/out/` exists before S3 sync.

---

## Commands: deploy (from repo root)

Replace `/path/to/repo` with your clone path.

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

Capture outputs:

```bash
terraform output -raw api_url
terraform output -raw web_bucket_name
terraform output -raw web_cloudfront_domain
```

Upload the static site (use bucket name from output):

```bash
aws s3 sync /path/to/repo/apps/web/out "s3://$(cd /path/to/repo/infra/terraform/envs/dev && terraform output -raw web_bucket_name)" --delete
```

**Web URL**: open `https://<web_cloudfront_domain>/` (CloudFront default certificate).

**API URL**: use `terraform output -raw api_url` as the base (no trailing slash required for relative `/things` paths).

---

## Commands: smoke test (recommended shape)

> **Status**: Implement `scripts/smoke/public-api-crud.mjs` (or similar) as a follow-up todo; until then, use `curl` manually with the same rules.

Environment:

- `API_BASE_URL` — only variable required for smoke (public HTTPS API Gateway URL).

Example manual sequence (no secrets in shell history beyond URL):

```bash
export API_BASE_URL="$(cd infra/terraform/envs/dev && terraform output -raw api_url)"

curl -sS -X POST "$API_BASE_URL/things" -H 'Content-Type: application/json' -d '{"name":"smoke-test"}'
# Parse id from JSON, then GET/PUT/DELETE using that id
```

Automated script should:

1. `POST /things` with a unique name.
2. `GET /things` and assert the new id appears.
3. `GET /things/:id`.
4. `PUT /things/:id` with a new name.
5. `DELETE /things/:id`.
6. `GET /things/:id` → expect 404.

Exit non-zero on any failure. **Do not print** response bodies containing anything other than the expected Thing shape unless debugging locally.

---

## Commands: teardown or cost pause

**Full teardown** (destroys infra; S3 bucket has `force_destroy = true` in dev stack—still verify no data you need):

```bash
cd infra/terraform/envs/dev
terraform destroy
```

**Pause API only** (if `enable_api_schedule_controls = true`): schedules set Lambda reserved concurrency to `0` on pause and remove override on resume. Adjust or disable schedules in AWS Console or Terraform if needed.

---

## CI vs manual smoke

- Today, **`.github/workflows/ci.yml`** does **not** deploy or call live AWS. That avoids accidental secret exposure and surprise spend.
- When you add a **deploy + smoke** workflow:
  - Use **OIDC** (`aws-actions/configure-aws-credentials`) or short-lived keys.
  - Pass `API_BASE_URL` from a prior Terraform output step **as a job output**, not as a public repo variable if you consider the URL sensitive.
  - Never pass Supabase or AWS secrets to the smoke job except via masked secrets for Terraform.

---

## Related docs

- [ADR-006: Full-stack and deployment](../adr/006-full-stack-and-deployment.md) — architecture decisions for monorepo, Lambda + Express, static web, Terraform.
- [infra/terraform/README.md](../../infra/terraform/README.md) — Terraform layout, cost controls, S3 sync.
- [docs/plans/zero-cost-first_e2e_deployment_plan_cd815a81.plan.md](./zero-cost-first_e2e_deployment_plan_cd815a81.plan.md) — broader initiative phases.

---

## Changelog for this guide

- Initial version: security review + deploy + smoke + external checklist; Lambda `NODE_ENV=production` documented and enforced in Terraform.
