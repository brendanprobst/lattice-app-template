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
  - id: add-supabase-cli-layout
    content: Add root supabase/ (config.toml, timestamped migrations), npm run supabase:push; see docs/playbooks/supabase-migrations.md
    status: pending
  - id: add-refresh-spawn-script
    content: Implement scripts/refresh-spawn.mjs + npm run scaffold:refresh (reads target .lattice/refresh.json); spec in docs/scaffold-workflow.md
    status: pending
  - id: add-scripts-smoke
    content: Optional scripts/smoke for deployed HTTPS (API_BASE_URL + BEARER_TOKEN); no secret logging—pairs with smoke guide
    status: pending
  - id: optional-deploy-workflow-oidc
    content: Optional GitHub Actions deploy + smoke with AWS OIDC; mask outputs; no echo of keys
    status: pending
  - id: gha-default-deploy-dx
    content: Deploy app is the GitHub path for site and Lambda (OIDC + Infisical). Dual-env by default (dev + prod folders, GitHub envs, Infisical paths). Terraform apply stays on the laptop until F5 remote state. The older Deploy (AWS) workflow remains unused.
    status: completed
  - id: terraform-github-oidc-deploy-role
    content: Terraform one GitHub OIDC deploy role per spawn (name like <app-slug>-gha). Reuse only the account-level token.actions.githubusercontent.com provider. Do not widen Fosterfolio’s role into a lattice-ecosystem mega-role. Each role trusts only repo:<org>/<spawn>:* and this app’s *-dev-* / *-prod-* names. Bootstrap stack, not envs/dev or envs/prod. Day-1 still pastes that spawn’s AWS_ROLE_ARN into GitHub. Implementation order: docs/plans/standup-automation.plan.md Phase 2.
    status: completed
  - id: spawn-standup-script
    content: npm run standup (Infisical folders + identity + gh env/vars/secrets + deploy:aws ACM wait). Follow docs/playbooks/standup-automation.md; prove on smoke-test dev then prod. Auth leftover + google-sso playbook + deploy:check URL/provider probe.
    status: completed
  - id: prod-swagger-and-lambda-logging
    content: Harden or disable /api-docs on public stacks; tune morgan/structured logging in Lambda
    status: pending
  - id: add-tflint-ci
    content: Wire tflint into CI (called out as future in infra/AGENTS.md)
    status: pending
  - id: remote-terraform-state
    content: Before the first apply, bootstrap an S3 state bucket and DynamoDB lock table, uncomment the backend in envs/dev/versions.tf, and use a distinct state key per environment so prod (envs/prod) cannot see or change the dev stack
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
  - id: docker-local-dev
    content: Ship a Docker (Compose) local-dev stack so a clone can run without matching the author's host Node/tooling versions
    status: pending
  - id: cli-throbber
    content: Shared terminal throbber/spinner for long-running laptop CLIs (standup, deploy:aws, scaffold, refresh, npm ci / npm run ci). Do not implement until this item is picked up.
    status: pending
  - id: teardown-command
    content: Far future — npm run teardown as the inverse of standup/deploy (confirmed terraform destroy + related cleanup). Do not pick up until this item is explicitly chosen.
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
| F0 | **`scripts/refresh-spawn.mjs`** | Re-sync long-lived spawns from local template; target owns `.lattice/refresh.json` — [scaffold workflow § Refresh](../scaffold-workflow.md#refresh-an-existing-spawn-re-sync-from-template). |
| F0b | **Supabase CLI layout** | Root `supabase/migrations/`, `npm run supabase:push` — [Supabase migrations playbook](../playbooks/supabase-migrations.md). |
| F1 | **`scripts/smoke`** | Deployed HTTPS checks with `API_BASE_URL` + `BEARER_TOKEN`; no secret logging. |
| F2 | **Deploy + smoke GitHub workflow** | AWS OIDC; masked outputs. |
| F2b | **GitHub Deploy app + Infisical** | **Done in template.** Spawn still fills vault keys once. **Deploy app** is the GitHub path. Terraform apply stays on the laptop until F5. Setup: [`docs/playbooks/infisical-github-deploys.md`](../playbooks/infisical-github-deploys.md). |
| F2c | **Terraform one GitHub OIDC role per spawn** | **Done in template** (`infra/terraform/bootstrap` + `modules/gha-deploy-role`). Day-1 applies (or **imports**) `<app-slug>-gha` and pastes `aws_role_arn` as `AWS_ROLE_ARN` until Phase 3 standup. Trust `repo:<org>/<spawn>:*` only. Permissions only that app’s `<project>-dev-*` / `<project>-prod-*`. Smoke-test: import `lattice-smoke-test-gha-arn` — do not create a second role. Do **not** manage `fosterfolio-gha-arn`. |
| F2d | **`npm run standup`** | **Done in template** (proven on smoke-test dev + prod). Leftover Auth checklist, [`google-sso.md`](../playbooks/google-sso.md), `deploy:check` key/provider/URL-pair probes. Playbook: [`standup-automation.md`](../playbooks/standup-automation.md). |
| F3 | **Prod hardening** | Restrict or disable `/api-docs` on public API URLs; Lambda logging verbosity (`morgan` vs structured). |
| F4 | **`tflint` in CI** | Stricter Terraform static analysis (`infra/AGENTS.md`). |
| F5 | **Remote Terraform state** | Before the first apply, create the S3 bucket and DynamoDB lock table (Terraform does not create them), uncomment the backend in `envs/dev/versions.tf`, and give each environment its own key (`lattice/dev/terraform.tfstate`, later `lattice/prod/terraform.tfstate`). Local state is fine only for a throwaway smoke; moving it later is `terraform init -migrate-state`. |
| F6 | **SSR / non-static Next.js** | Only when the product needs it—larger change from static export. |
| F7 | **Always-on API (e.g. App Runner)** | Higher baseline cost; simpler ops if you outgrow Lambda cold starts. |
| F8 | **Supabase RLS / policies** | Tighten before real production data; align with service-role usage. |
| F9 | **Docker local-dev stack** | Dockerfile + Compose (or equivalent) so anyone can `docker compose up` after clone instead of matching the author's host Node 22, npm, and tooling. Goal is environment parity for contributors, not a production container deploy (that stays F7 / App Runner). |
| F10 | **CLI throbber** | Shared spinner for long-running laptop tasks (`standup`, `deploy:aws`, `scaffold`, `scaffold:refresh`, `npm ci` / `npm run ci`). One helper, TTY-aware, no spinner in CI logs. Do not implement until this item is picked up. |

### Far future (do not pick up soon)

| Order | Item | Notes |
|-------|------|--------|
| F20 | **`npm run teardown`** | Inverse of `standup` / `deploy:aws`: confirmed destroy of the env stack (and later related cleanup). Manual `terraform destroy` in the [smoke guide](./smoke_test_deployment_guide.plan.md#commands-teardown-or-cost-pause) is enough until then. Do not implement until this item is explicitly chosen. |

The **YAML `todos`** at the top of this file mirror these items for tooling and agents; update statuses there when work completes.
