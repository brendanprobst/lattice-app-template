---
name: Spawn standup automation
overview: Harvest smoke-test day-1 failures into the template, then add npm run standup so a spawn’s GitHub identity, GHA role, Infisical folders, ACM wait, and laptop apply are one command. Prove idempotent on lattice-app-smoke-test dev, then stand up prod.
todos:
  - id: harvest-preflight-acm
    content: "Phase 1 — Template harvest: Deploy app secret preflight; ACM validation outputs; refuse CloudFront attach while cert is PENDING; slugs as repo vars; GetFunctionConfiguration in playbook/module contract"
    status: completed
  - id: terraform-gha-role
    content: "Phase 2 — F2c bootstrap stack: one <app-slug>-gha role, trust repo:owner/repo:*, permissions on this app’s *-dev-* and *-prod-* including lambda:GetFunctionConfiguration; write AWS_ROLE_ARN"
    status: pending
  - id: standup-script
    content: "Phase 3 — npm run standup: Infisical folders + github-<app> identity + gh environments/vars/secrets; idempotent; never grant /sensitive to GitHub"
    status: pending
  - id: deploy-aws-acm-wait
    content: "Phase 4 — deploy:aws prints registrar CNAMEs, polls ACM to ISSUED, then applies CloudFront alias/cert; skip Infisical sync when outputs unchanged"
    status: pending
  - id: refresh-smoke-dev
    content: "Phase 5 — refresh template into lattice-app-smoke-test, run standup --env dev (no-op remaining work), confirm Deploy app + https://dev.lattice.brendanprobst.com"
    status: pending
  - id: standup-prod
    content: "Phase 6 — standup --env prod on smoke-test (new envs/prod state), ACM wait for lattice.brendanprobst.com, Deploy app from main + reviewer"
    status: pending
isProject: true
---

# Spawn standup automation

Human follow-along: [`docs/playbooks/standup-automation.md`](../playbooks/standup-automation.md).

This plan is the **implementation order**. Do the work in the **template** (`lattice-app-template`), refresh into **smoke-test**, then stand up **prod**. Do not invent a second Infisical project, a shared `lattice-ecosystem-gha` role, or Terraform-in-GHA (that is F5).

**Related:** [Infisical and GitHub deploys](../playbooks/infisical-github-deploys.md), [Route 53 custom domain](../playbooks/route53-custom-domain.md), [template completeness backlog](./template_completeness_backlog.plan.md) F2b / F2c / F2d. Spawn-only names for the canary live in that repo’s `docs/playbooks/lattice-smoke-test-deploys.md`.

---

## Why

Smoke-test **dev** reached `https://dev.lattice.brendanprobst.com`, but day 1 was four consoles and two deploy paths. Failures that must not repeat on prod:

| Failure | Fix in this plan |
| --- | --- |
| Infisical 401 (wrong/missing repo secrets) | Phase 1 preflight + Phase 3 `gh secret set` |
| OIDC `sub` was a pasted GitHub URL | Phase 2 Terraform trust `repo:<owner>/<repo>:*` |
| Lambda waiter missing `GetFunctionConfiguration` | Phase 2 role policy |
| CloudFront `InvalidViewerCertificate` on PENDING ACM | Phase 1 guard + Phase 4 wait |
| Apex ACM token copied onto `dev.lattice` | Phase 1 / 4 printed validation CNAME |
| “I already deployed” (Deploy app vs `deploy:aws`) | Phase 3–4 one laptop command; logs name the path |

**One-step target** (after a short spawn file / flags): `npm run standup -- --env <env>`. Still human: Supabase URL/anon once, registrar CNAMEs if DNS is not Route 53, prod GitHub reviewer.

---

## Invariants (do not regress)

- One Infisical project (`lattice`, slug `lattice-ecosystem-7iyf`). Apps are `/<app-slug>/**`.
- One machine identity per spawn (`github-<app-slug>`). Read `/shared` and `/flags` only. Never `/sensitive`.
- One AWS OIDC role per spawn. Trust **this repo only**. Permissions **this app’s** `*-dev-*` and `*-prod-*` only.
- GitHub environments `dev` / `prod` are approval + Infisical `env-slug`. Identity, role, and slugs live **once** on the repo.
- `INFISICAL_PROJECT_SLUG` and `INFISICAL_APP_SLUG` are repository **variables**. Client id/secret and `AWS_ROLE_ARN` are repository **secrets**.
- Template is not deployed and must not get an Infisical folder.
- Laptop `terraform apply` stays on the laptop until F5. **Deploy app** is site + Lambda only.

---

## Phase 1 — Harvest (template, no new product surface)

Ship the smoke-test lessons as code and outputs. No `standup` script yet.

### Deploy app

File: `.github/workflows/deploy-app.yml`

- Before the Infisical action, fail if `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, or `AWS_ROLE_ARN` is empty.
- Print **lengths** and whether `INFISICAL_CLIENT_ID` looks like a UUID. Do not print values.
- Prefer `vars.INFISICAL_PROJECT_SLUG` / `vars.INFISICAL_APP_SLUG` (secrets still accepted as fallback).
- Error text: set these **once** under repository Actions, not on each environment.

### ACM / CloudFront (Terraform)

Files: `infra/terraform/envs/dev` and `envs/prod` (keep them twins)

- Output `acm_validation_record_name` and `acm_validation_record_value` when `web_custom_domain` is set (even if `manage_web_dns_in_route53 = false`).
- Do not update CloudFront `aliases` / `viewer_certificate` onto a cert that is not `ISSUED`. Fail with the two `dig` commands and the registrar CNAME table.
- Keep `create_before_destroy` on ACM. Do not destroy the in-use cert until CloudFront has switched.

### Docs

- [infisical-github-deploys.md](../playbooks/infisical-github-deploys.md): slugs as **variables**; drop `INFISICAL_PROJECT_ID` from the GitHub list; Lambda actions include `GetFunctionConfiguration`; link this playbook.
- [route53-custom-domain.md](../playbooks/route53-custom-domain.md): path C (registrar DNS) prints the same ACM outputs; never copy another hostname’s `_hash` onto the new name.

### Done when

- `npm run ci` still passes in the template.
- A reviewer can see the new workflow step and Terraform outputs in the diff without running AWS.

---

## Phase 2 — F2c GitHub OIDC role (Terraform bootstrap)

New stack, **not** `envs/dev` or `envs/prod` state.

### Layout (suggested)

- `infra/terraform/bootstrap/` or `infra/terraform/modules/gha-deploy-role/` + a thin `envs/bootstrap` (local state is OK until F5).
- Inputs: `app_slug`, `github_owner`, `github_repo`, `aws_account_id`, `project_name` (for `*-dev-*` / `*-prod-*` ARNs).
- Look up existing `token.actions.githubusercontent.com`. Do not create a second provider.
- Role name: `<app-slug>-gha` (smoke-test live name is `lattice-smoke-test-gha-arn` — import or leave; do not create a duplicate).
- Trust:

```text
repo:<github_owner>/<github_repo>:*
```

Validate: `sub` must match `^repo:[^/]+/[^/:]+:\*` and must not contain `https://`.

- Permissions (this app only):

  - S3 list + object R/W on `<project>-dev-web` and `<project>-prod-web`
  - CloudFront invalidate / get on this account’s distributions (or the two known IDs once they exist)
  - Lambda `UpdateFunctionCode`, `GetFunction`, `GetFunctionConfiguration` on `<project>-dev-api` and `<project>-prod-api`

- Output `aws_role_arn`. A helper or Phase 3 writes `gh secret set AWS_ROLE_ARN`.

### Done when

- `terraform apply` in bootstrap on smoke-test is a no-op or an import of `lattice-smoke-test-gha-arn`.
- Trust `sub` is `repo:brendanprobst/lattice-app-smoke-test:*`.
- Fosterfolio’s `fosterfolio-gha-arn` is untouched.

---

## Phase 3 — `npm run standup`

New script, e.g. `scripts/standup.mjs`, wired in root `package.json`.

```bash
npm run standup -- --env dev
npm run standup -- --env prod
```

Idempotent. Reads `.lattice/infisical.json` `appSlug`, `.infisical.json` `workspaceId`, `git remote`, `aws sts get-caller-identity`.

### Steps the script runs

1. Ensure Infisical folders `/<app>/{shared,flags,sensitive}` exist in **both** Infisical envs `dev` and `prod` (folder create is cheap; do not overwrite secret values).
2. Ensure machine identity `github-<appSlug>` exists, Universal Auth on, ACL read on `/<app>/shared` and `/<app>/flags` for `dev` and `prod`. Never `/sensitive`.
3. If GitHub is missing `INFISICAL_CLIENT_ID` / `SECRET`, mint or reuse the identity secret and `gh secret set` (print “set” / “already present”, never the secret).
4. `gh api` create GitHub environments `dev` and `prod` if missing; `prod` requires a reviewer when the API allows it.
5. `gh variable set INFISICAL_PROJECT_SLUG` and `INFISICAL_APP_SLUG`.
6. Apply / reuse Phase 2 role; `gh secret set AWS_ROLE_ARN` if missing or different.
7. Call through to Phase 4 (`deploy:aws` for `--env`) unless `--bootstrap-only`.
8. Log: `GitHub Deploy app is site and Lambda only. Terraform ran on this laptop.`

### Still not automated

- Creating the Infisical **organization** / `lattice` project (already exists).
- Creating Supabase projects; script may `infisical secrets set` from `apps/web/.env.*` if those files exist.
- Registrar UI.

### Done when

- Dry-run on smoke-test prints a checklist of already-present pieces and exits 0.
- `npm run standup -- --help` documents flags.

---

## Phase 4 — ACM wait inside `deploy:aws`

- After apply creates/updates the ACM cert, if status is not `ISSUED` and DNS is not Route 53-managed:
  1. Print site CNAME (`<domain>` → `web_cloudfront_domain`) and ACM validation CNAME (Terraform outputs).
  2. Poll ACM (or tell the operator to re-run) until `ISSUED`.
  3. Apply CloudFront alias + cert + Lambda `CORS_ORIGINS` only then.
- `infisical:sync-outputs` already runs after apply. If the four keys are unchanged, log `skip Infisical output sync (unchanged)`.

### Done when

- Replaying a hostname retarget cannot produce `InvalidViewerCertificate` from a pending cert.
- Operator never has to guess which `_hash` CNAME belongs to which hostname.

---

## Phase 5 — Refresh smoke-test and prove one-step on live dev

From the template checkout:

```bash
npm run scaffold:refresh -- --into ../lattice-app-smoke-test
```

Then in smoke-test: follow [standup-automation.md](../playbooks/standup-automation.md) Phase 5. Fix only refresh fallout (preservePaths already has `docs/playbooks/lattice-smoke-test-deploys.md`).

### Done when

- `npm run standup -- --env dev` is a no-op (or only harmless GitHub var moves).
- **Deploy app** → `dev` is green.
- `https://dev.lattice.brendanprobst.com` still loads.

---

## Phase 6 — Prod (only after Phase 5)

Same command, new state:

```bash
npm run standup -- --env prod
```

Requires `envs/prod/terraform.tfvars` filled on day 1 (already the dual-env rule). Hostname `lattice.brendanprobst.com`. Do **not** change `environment` on the live `envs/dev` state.

### Done when

- Prod stack exists (`lattice-app-smoke-test-prod-*`).
- ACM for the apex is Issued and attached.
- **Deploy app** → `prod` from `main` after the reviewer click.
- Dev URL still works.

---

## Out of scope

- F5 remote Terraform state / Terraform in GitHub Actions.
- One AWS role for every Lattice repo.
- Infisical GitHub OIDC (nice follow-up; Universal Auth + `gh secret set` is enough for this slice).
- Squarespace/Google Domains API.
- Fosterfolio migration onto `npm run standup` (optional after smoke-test prod).
