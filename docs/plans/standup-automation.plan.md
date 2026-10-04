---
name: Spawn standup automation
overview: Harvest smoke-test day-1 failures into the template, then add npm run standup so a spawn’s GitHub identity, GHA role, Infisical folders, per-app Route 53 zone, ACM wait, and laptop apply are one command. Prove on lattice-app-smoke-test dev, then stand up prod.
todos:
  - id: harvest-preflight-acm
    content: "Phase 1 — Template harvest: Deploy app secret preflight; ACM validation outputs; refuse CloudFront attach while cert is PENDING; slugs as repo vars; GetFunctionConfiguration in playbook/module contract"
    status: completed
  - id: terraform-gha-role
    content: "Phase 2 — F2c bootstrap stack: one <app-slug>-gha role, trust repo:owner/repo:*, permissions on this app’s *-dev-* and *-prod-* including lambda:GetFunctionConfiguration; write AWS_ROLE_ARN"
    status: completed
  - id: standup-script
    content: "Phase 3 — npm run standup: Infisical folders + github-<app> identity + gh environments/vars/secrets; idempotent; never grant /sensitive to GitHub"
    status: completed
  - id: deploy-aws-acm-wait
    content: "Phase 4 — deploy:aws prints registrar CNAMEs, polls ACM to ISSUED, then applies CloudFront alias/cert; skip Infisical sync when outputs unchanged"
    status: completed
  - id: per-spawn-dns-zone
    content: "Phase 5 — One Route 53 zone per spawn (not envs/dev or envs/prod): create once, print NS, both envs set route53_hosted_zone_id; never create_route53_hosted_zone in env state"
    status: completed
  - id: refresh-smoke-dev
    content: "Phase 6 — refresh template into lattice-app-smoke-test, delegate lattice.brendanprobst.com, standup --env dev, confirm Deploy app + https://dev.lattice.brendanprobst.com"
    status: pending
  - id: standup-prod
    content: "Phase 7 — standup --env prod on smoke-test (new envs/prod state), same zone, Deploy app from main + reviewer"
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

**One-step target** (after a short spawn file / flags): `npm run standup -- --env <env>`. Still human: Supabase URL/anon once, **one NS delegation** at the parent registrar for this spawn’s zone (Phase 5), prod GitHub reviewer. Path C (two ACM CNAMEs per env) stays the escape hatch when the app is not on a delegated zone.

---

## Invariants (do not regress)

- One Infisical project (`lattice`, slug `lattice-ecosystem-7iyf`). Apps are `/<app-slug>/**`.
- One machine identity per spawn (`github-<app-slug>`). Read `/shared` and `/flags` only. Never `/sensitive`.
- One AWS OIDC role per spawn. Trust **this repo only**. Permissions **this app’s** `*-dev-*` and `*-prod-*` only.
- One Route 53 hosted zone per spawn (this app’s hostname tree, e.g. `lattice.brendanprobst.com`). Created **once**, not in `envs/dev` or `envs/prod` state. Both envs set `create_route53_hosted_zone = false` and the same `route53_hosted_zone_id`. Do not put the personal apex `brendanprobst.com` in a spawn stack. Do not create a second zone for `fosterfolio.com`.
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

- `infra/terraform/modules/gha-deploy-role/` + thin `infra/terraform/bootstrap/` (not `envs/bootstrap`, so `deploy:aws --env` cannot target it). Local state is OK until F5.
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

- Output `aws_role_arn`. A helper or Phase 3 writes `gh secret set AWS_ROLE_ARN`. Import steps for `lattice-smoke-test-gha-arn`: [`infra/terraform/bootstrap/README.md`](../../infra/terraform/bootstrap/README.md).

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

## Phase 5 — One Route 53 zone per spawn (template, before refresh)

Fosterfolio was easy because the domain **is** the app and already has a zone. Smoke-test sits on `brendanprobst.com` (personal site at Google Domains), so day-1 used path C (`manage_web_dns_in_route53 = false`) and two registrar CNAMEs per hostname. Do not move the personal apex into AWS. Do not share one `brendanprobst.com` zone across every Lattice repo.

**Default:** one public hosted zone per spawn, covering that app’s hostname tree. Smoke-test zone name is `lattice.brendanprobst.com` (hosts `lattice.brendanprobst.com` and `dev.lattice.brendanprobst.com`). A later spawn gets `runout.brendanprobst.com`, not a record in the smoke-test zone.

### Layout (suggested)

- Thin stack `infra/terraform/dns-zone/` (not `envs/`, not inside `bootstrap/` IAM state). Same idea as Phase 2: `deploy:aws --env` cannot target it. Local state is OK until F5.
- Module optional if the stack is a single `aws_route53_zone`.
- Inputs: `zone_name` (FQDN of **this app’s** island, not the parent personal apex), `app_slug` / `project_name` for tags.
- Reject `zone_name` that is only `brendanprobst.com` or `fosterfolio.com` unless an explicit override exists — the point is a **child** island (or a domain the spawn already owns, like Fosterfolio’s existing zone).
- Look up / import an existing zone by name if it already exists. Do not create a second zone for the same `zone_name`.
- Outputs: `route53_hosted_zone_id`, `name_servers`.

### `envs/dev` and `envs/prod` (keep them twins)

- When the spawn uses this pattern: `manage_web_dns_in_route53 = true`, `create_route53_hosted_zone = false`, `route53_hosted_zone_id = <dns-zone output>`.
- Add a check or loud docs: `create_route53_hosted_zone = true` in an env stack is the Fosterfolio-dev footgun (a second zone for the same name; registrar NS will not match). Prefer path B against the Phase 5 zone.
- Path C (`manage_web_dns_in_route53 = false`) remains valid when there is no delegated zone.

### Standup / docs

- `npm run standup` applies (or no-ops) `dns-zone` with the GHA bootstrap, prints **NS** for the parent registrar, and does not print leftover ACM `_hash` CNAMEs when Route 53 manages the zone.
- [route53-custom-domain.md](../playbooks/route53-custom-domain.md): add **path D** — per-spawn zone + NS delegation at the parent. Path A (`create_route53_hosted_zone` in `envs/dev`) is no longer the recommended Lattice default.
- Do not apply this stack in the Fosterfolio account against `fosterfolio.com`. Leave `Z086583512U74ZET8C9T8` as Fosterfolio prod’s zone.

### Done when

- Template tree has the dns-zone stack and docs. `terraform validate` / `infra:fmt` still pass.
- A reviewer can see that `envs/*` cannot create the per-spawn zone.
- No apply against live smoke-test or Fosterfolio in this phase (refresh is Phase 6).

---

## Phase 6 — Refresh smoke-test and prove one-step on live dev

From the template checkout, on the commit that has Phases 1–5:

```bash
npm run scaffold:refresh -- --into ../lattice-app-smoke-test
```

Then in smoke-test: follow [standup-automation.md](../playbooks/standup-automation.md) Phase 6. Fix only refresh fallout (preservePaths already has `docs/playbooks/lattice-smoke-test-deploys.md`).

Human once: at Google Domains, NS-delegate **`lattice.brendanprobst.com`** to the printed nameservers (do not change nameservers for `brendanprobst.com`). Flip spawn tfvars to path B against that zone id.

### Done when

- One zone `lattice.brendanprobst.com`; `dig NS lattice.brendanprobst.com` matches Route 53.
- `envs/dev` and (filled) `envs/prod` share that `route53_hosted_zone_id`. Neither sets `create_route53_hosted_zone = true`.
- `npm run standup -- --env dev` exits 0. Dev hostname still `dev.lattice.brendanprobst.com`.
- **Deploy app** → `dev` is green.
- `https://dev.lattice.brendanprobst.com` still loads.

---

## Phase 7 — Prod (only after Phase 6)

Same command, new state:

```bash
npm run standup -- --env prod
```

Requires `envs/prod/terraform.tfvars` filled on day 1 (already the dual-env rule). Hostname `lattice.brendanprobst.com`. Same `route53_hosted_zone_id` as dev. `manage_web_dns_in_route53 = true`. Do **not** change `environment` on the live `envs/dev` state.

### Done when

- Prod stack exists (`lattice-app-smoke-test-prod-*`).
- ACM for the apex is Issued and attached (Route 53 validation, not a Google `_hash` paste).
- **Deploy app** → `prod` from `main` after the reviewer click.
- Dev URL still works.

---

## Out of scope

- F5 remote Terraform state / Terraform in GitHub Actions.
- One AWS role for every Lattice repo.
- One Route 53 zone for all of `brendanprobst.com` (would put the personal site in AWS).
- Infisical GitHub OIDC (nice follow-up; Universal Auth + `gh secret set` is enough for this slice).
- Squarespace/Google Domains API (NS click stays human).
- Fosterfolio migration onto `npm run standup` or collapsing Fosterfolio’s two `fosterfolio.com` zones (optional after smoke-test prod).
