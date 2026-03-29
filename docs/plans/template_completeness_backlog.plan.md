---
name: Template completeness backlog
overview: Advisory record for fork-first Lattice template—v1 “done” line, assessment, low-hanging fixes, and future backlog. Work items are ordered for one-by-one execution when ready.
todos:
  - id: align-root-package-json-description
    content: Update root package.json description (remove “Next.js and infra planned”; align with current stack); re-run fork:check after template renames
    status: pending
  - id: fix-adr-006-things-auth-drift
    content: Update ADR-006 negative consequences—/things is protected by requireSupabaseAuth; remove or correct “no auth on /things”
    status: pending
  - id: verify-terraform-lock-committed
    content: Ensure infra/terraform/envs/dev/.terraform.lock.hcl stays committed when providers change (CI/laptop parity)
    status: pending
  - id: add-scripts-smoke
    content: Optional scripts/smoke for deployed HTTPS (API_BASE_URL + BEARER_TOKEN); no secret logging—pairs with smoke guide
    status: pending
  - id: optional-deploy-workflow-oidc
    content: Optional GitHub Actions deploy + smoke with AWS OIDC; mask outputs; no echo of keys
    status: pending
  - id: prod-swagger-and-lambda-logging
    content: Harden or disable /api-docs on public stacks; tune morgan/structured logging in Lambda
    status: pending
  - id: add-tflint-ci
    content: Wire tflint into CI (called out as future in infra/AGENTS.md)
    status: pending
  - id: remote-terraform-state
    content: Document/enable S3+DynamoDB backend before shared or prod work (already referenced in README/infra)
    status: pending
  - id: future-ssr-next
    content: If product needs SSR—deferred in ADR-006; larger upgrade from static export
    status: pending
  - id: future-app-runner-api
    content: Document/optional migrate to App Runner or container API for always-on—ADR-006 alternative path
    status: pending
  - id: tighten-supabase-rls
    content: Tighten RLS/policies before real production data (service-role patterns)—see smoke guide SQL section
    status: pending
isProject: false
---

# Template completeness backlog

This plan captures a **template health review** for Lattice as a **fork-first** monorepo: DDD API, Next.js static web, Supabase, Terraform on AWS, CI, and manual deploy/smoke paths. Use it to decide what is **in scope for v1** vs **later**, and to work through improvements incrementally.

**Related:** [Scaffold workflow](../scaffold-workflow.md) (new repo + clone + `npm run scaffold` — no GitHub fork), [Smoke test deployment guide](./smoke_test_deployment_guide.plan.md) (canonical deploy runbook), [ADR-006](../adr/006-full-stack-and-deployment.md) (full-stack and hosting decisions).

---

## Where to start (orientation)

| Area | Start here |
|------|------------|
| New app from template | [Scaffold workflow](../scaffold-workflow.md), `npm run scaffold`, `scripts/fork.mjs` |
| Fork → rename | Root `README.md`, `scripts/fork.mjs`, `npm run fork:check` |
| Local + CI | Root `package.json` (`npm run ci`), `.github/workflows/ci.yml` |
| Deploy + smoke | [smoke_test_deployment_guide.plan.md](./smoke_test_deployment_guide.plan.md), `infra/terraform/README.md`, `infra/terraform/envs/dev/terraform.tfvars.example` |
| Architecture | [ADR-006](../adr/006-full-stack-and-deployment.md), [ADR-007](../adr/007-ci-and-environment-promotion.md) |

---

## Line in the sand — v1 “done” for the template

Call the template **v1 complete** when:

1. **`npm ci`** and **`npm run ci`** pass on a clean clone (matches the main CI job).
2. **Fork onboarding works:** `fork:init` / `fork:check` are usable so a new repo can rebrand without fragile hand edits.
3. **One successful manual deploy** on a **fork** (not only upstream): Terraform apply, static web upload, **web-first smoke** (login → profile → Things) per the smoke guide—the path is **repeatable**, not necessarily automated.
4. **Cost posture is explicit:** “Free forever” is not guaranteed; defaults aim at **low idle cost** (serverless API, static site, budgets, optional pause). Supabase and AWS free tiers have their own limits ([ADR-006](../adr/006-full-stack-and-deployment.md)).

Anything beyond that (CI deploy, `scripts/smoke`, tflint, SSR) is **v1.1+**, not a blocker for “fork tonight.”

---

## Assessment snapshot (reference)

**Rating: ~7.5 / 10** for the goal *fork → deployed cheap-by-default stack → clear upgrade path*.

**Strengths:** Fork tooling, CI parity with `npm run ci`, env examples, Playwright E2E (synthetic JWT), documented Terraform + cost knobs, ADRs for upgrades.

**Gaps:** No push-button deploy in GitHub Actions (manual by design today); a few doc/code drifts (tracked below); AWS + Supabase setup remains an external prerequisite.

---

## Low-hanging fruit (do soon)

High value, small scope—work in roughly this order:

1. **Root `package.json` description** — Still says “Next.js and infra planned”; the stack is implemented. Update to match reality; after template renames, run **`npm run fork:check`**.
2. **ADR-006 drift** — Consequences still suggest unauthenticated `/things`. Routes use `requireSupabaseAuth` (`apps/api/routes/things.ts`). Update ADR-006 so security/architecture readers are not misled.
3. **Smoke guide alignment** — Optional `scripts/smoke` and OIDC deploy workflow remain tracked in the smoke guide frontmatter and in **Future backlog** below; this file does not duplicate those implementation details.
4. **Fork hygiene (in each fork)** — Enable **Dependabot** in GitHub repo settings if you want automated PRs (`.github/dependabot.yml` exists). Set **`repository.url`** after `fork:init`.
5. **Terraform lock file** — Keep **`infra/terraform/envs/dev/.terraform.lock.hcl`** committed when providers change so CI and laptops match.

---

## Future backlog (one-by-one)

| Order | Item | Notes |
|-------|------|--------|
| F1 | **`scripts/smoke`** | Deployed HTTPS checks with `API_BASE_URL` + `BEARER_TOKEN`; no secret logging. |
| F2 | **Deploy + smoke GitHub workflow** | AWS OIDC; masked outputs. |
| F3 | **Prod hardening** | Restrict or disable `/api-docs` on public API URLs; Lambda logging verbosity (`morgan` vs structured). |
| F4 | **`tflint` in CI** | Stricter Terraform static analysis (`infra/AGENTS.md`). |
| F5 | **Remote Terraform state** | S3 + DynamoDB lock before team/shared prod. |
| F6 | **SSR / non-static Next.js** | Only when the product needs it—larger change from static export. |
| F7 | **Always-on API (e.g. App Runner)** | Higher baseline cost; simpler ops if you outgrow Lambda cold starts. |
| F8 | **Supabase RLS / policies** | Tighten before real production data; align with service-role usage. |

The **YAML `todos`** at the top of this file mirror these items for tooling and agents; update statuses there when work completes.
