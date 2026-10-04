# Playbook — automate spawn standup

Follow this after [the implementation plan](../plans/standup-automation.plan.md). Work lives in **`lattice-app-template`**. Prove it on **`lattice-app-smoke-test`** (dev is already live). Only then stand up **prod**.

You do not need to be the person who writes the code. Each phase is: open a chat in the template → paste the **Agent prompt** → run the **You do** checks → tick the phase.

## What “one-step” means when you are done

```bash
# spawn repo, after tfvars + web env files exist
npm run standup -- --env dev
gh workflow run "Deploy app" --field environment=dev

npm run standup -- --env prod
# click the GitHub prod reviewer
```

Still typed by a human: Supabase URL/anon (once), **Google SSO** on that project ([google-sso.md](google-sso.md)), **one NS delegation** at the parent registrar for this spawn’s zone, prod approval. Two ACM CNAMEs per env only if you stay on path C. Standup reprints the Auth checklist at the end.

## Ground rules

- Implement in the **template**. Refresh into smoke-test. Do not hand-port files.
- One Infisical project (`lattice` / `lattice-ecosystem-7iyf`). One identity, one AWS role, and one Route 53 zone **per spawn**.
- Do not put secrets on GitHub environments. Do not grant `/sensitive` to GitHub when Infisical allows path-scoped ACL. On the current lattice project plan, additional privileges and custom roles are gated; standup then assigns built-in viewer so Deploy app can read `/shared` and `/flags`.
- Do not apply Terraform in GitHub. **Deploy app** = site + Lambda. Laptop = Terraform + first cert.
- Do not change `environment` in live `envs/dev` tfvars to `prod`.
- Do not touch `fosterfolio-gha-arn` or create a second `fosterfolio.com` zone.
- Do not put `brendanprobst.com` (the personal apex) in a spawn stack. The smoke-test zone is `lattice.brendanprobst.com`.
- Do not set `create_route53_hosted_zone = true` in `envs/dev` or `envs/prod` for that per-spawn zone.
- Commit in the template when a phase is done. Refresh only after Phase 5 (or after Phase 1 if you want an early smoke-test workflow fix — optional).

## Repos

| Repo | Path | Role |
| --- | --- | --- |
| Template | `lattice-app-template` | All implementation |
| Canary | `lattice-app-smoke-test` | Refresh target; live **dev** at `https://dev.lattice.brendanprobst.com` |
| Names | `lattice-app-smoke-test/docs/playbooks/lattice-smoke-test-deploys.md` | Spawn-only hostnames / slugs |

Smoke-test facts you will reuse:

| Thing | Value |
| --- | --- |
| App slug | `lattice-smoke-test` |
| GitHub | `brendanprobst/lattice-app-smoke-test` |
| Infisical project slug | `lattice-ecosystem-7iyf` |
| GHA role (today) | `lattice-smoke-test-gha-arn` |
| Dev hostname | `dev.lattice.brendanprobst.com` |
| Planned prod hostname | `lattice.brendanprobst.com` |
| DNS today | Google Domains, path C (`manage_web_dns_in_route53 = false`) |
| DNS after Phase 5–6 | Route 53 zone `lattice.brendanprobst.com` (NS at Google for that name only). Dev + prod share `route53_hosted_zone_id`. |

---

## Phase 1 — Harvest the day-1 failures

**Goal:** The next 401 / OIDC / pending-cert failure explains itself.

### Agent prompt (template repo)

```text
Implement Phase 1 of docs/plans/standup-automation.plan.md.

1. .github/workflows/deploy-app.yml — before Infisical, fail if INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET, or AWS_ROLE_ARN is empty. Print lengths and whether CLIENT_ID looks like a UUID. Do not print values. Prefer vars for INFISICAL_PROJECT_SLUG and INFISICAL_APP_SLUG (secrets as fallback). Tell the operator to set these once on the repo, not on each environment.

2. Terraform envs/dev and envs/prod — output ACM validation CNAME name/value when web_custom_domain is set. Do not attach a non-ISSUED cert to CloudFront; fail with dig commands and the registrar table. Do not destroy the in-use cert until CloudFront has switched.

3. Update docs/playbooks/infisical-github-deploys.md (slugs as repo variables, drop INFISICAL_PROJECT_ID from the GitHub list, Lambda GetFunctionConfiguration, link docs/playbooks/standup-automation.md) and route53-custom-domain.md path C (never copy another hostname’s ACM hash).

Do not add npm run standup yet. Do not change Fosterfolio. Run the template checks that this repo already uses for workflow/terraform docs.
```

### You do

1. Read the PR/diff. Confirm no secret is echoed.
2. Merge or commit on template `main` (or a branch you keep for all seven phases).

**Pass:** workflow preflight and ACM outputs exist in the template tree. `npm run ci` (or the repo’s usual `build lint type-check`) is green enough to continue.

---

## Phase 2 — Terraform the GHA role

**Goal:** Nobody pastes a GitHub URL into an IAM trust policy again.

### Agent prompt

```text
Implement Phase 2 of docs/plans/standup-automation.plan.md (backlog F2c).

Add a bootstrap Terraform stack (not envs/dev or envs/prod) that looks up the existing token.actions.githubusercontent.com provider and creates one role per spawn: <app-slug>-gha.

Trust: repo:<owner>/<repo>:* only. Reject a sub that contains https://.
Permissions: this app’s <project>-dev-web / -prod-web, CloudFront invalidate, Lambda UpdateFunctionCode + GetFunction + GetFunctionConfiguration on <project>-dev-api / -prod-api.

Output aws_role_arn. Document how to import lattice-smoke-test-gha-arn so we do not create a second role.

Do not apply in the Fosterfolio account against Fosterfolio’s role. Do not widen trust to every repo.
```

### You do

1. From **smoke-test** (after refresh, or a worktree of the template files), review `infra/terraform/bootstrap`. The agent must **not** apply this in the Fosterfolio account against `fosterfolio-gha-arn`.
2. Prefer **import** of `lattice-smoke-test-gha-arn` over create. Set `role_name = "lattice-smoke-test-gha-arn"` and follow [`infra/terraform/bootstrap/README.md`](../../infra/terraform/bootstrap/README.md). Creating `lattice-smoke-test-gha` is a second role — do not do that.
3. Confirm trust:

```bash
aws iam get-role --role-name lattice-smoke-test-gha-arn \
  --query 'Role.AssumeRolePolicyDocument'
```

`sub` must be `repo:brendanprobst/lattice-app-smoke-test:*`.

**Pass:** one role, correct `sub`, `GetFunctionConfiguration` present. Fosterfolio role unchanged.

---

## Phase 3 — `npm run standup`

**Goal:** Identity, folders, GitHub env/vars/secrets, and role ARN are a command.

### Agent prompt

```text
Implement Phase 3 of docs/plans/standup-automation.plan.md.

Add scripts/standup.mjs and npm run standup -- --env <dev|prod> [--bootstrap-only].

Idempotent. Use .lattice/infisical.json appSlug, .infisical.json workspaceId, git remote, aws sts.
Create Infisical /<app>/{shared,flags,sensitive} in both Infisical envs if missing.
Create github-<appSlug> with read on /shared and /flags only. Never /sensitive.
gh: create environments dev/prod; set repo vars INFISICAL_PROJECT_SLUG and INFISICAL_APP_SLUG; set secrets CLIENT_ID/SECRET/AWS_ROLE_ARN if missing (print “set” not the value).
Call Phase 2 apply. Do not call deploy:aws yet unless Phase 4 is already merged — if not, stop after --bootstrap-only behavior.

Add --help. Never log secrets.
```

### You do

In **smoke-test** (after a refresh, or by running the script from template with `--into` only if the agent says so — prefer refresh in Phase 6). Until Phase 6, you can run a dry check from the template against smoke-test **only if** the script is built to take `--repo`. Otherwise wait for Phase 6.

**Pass:** `npm run standup -- --help` works in the template. No secret in stdout.

---

## Phase 4 — ACM wait in `deploy:aws`

**Goal:** `terraform apply` cannot attach a pending cert.

### Agent prompt

```text
Implement Phase 4 of docs/plans/standup-automation.plan.md.

Teach npm run deploy:aws (and standup, if it calls deploy:aws) to:
1. Print site CNAME and ACM validation CNAME from Terraform outputs when manage_web_dns_in_route53 is false.
2. Poll ACM until ISSUED (or exit with those records and a clear “re-run after Issued”).
3. Only then apply CloudFront alias/cert and CORS.
4. Skip infisical:sync-outputs when the four keys are unchanged.

Wire npm run standup -- --env X to run this laptop apply after bootstrap, unless --bootstrap-only.
```

### You do

Read one dry `deploy:aws` log (or the new helper output). Confirm the printed ACM name is the **current** cert’s `_hash`, not another hostname’s.

**Pass:** docs + script make it impossible to apply the Phase-1 `InvalidViewerCertificate` path without a loud stop.

---

## Phase 5 — One Route 53 zone per spawn

**Goal:** ACM validation and the site alias are Terraform-managed for this app, without moving `brendanprobst.com` or sharing one zone across every Lattice repo.

Do this in the **template** before any smoke-test refresh.

### Agent prompt (template repo)

```text
Implement Phase 5 of docs/plans/standup-automation.plan.md.

Add a dns-zone Terraform stack (not envs/dev, not envs/prod, not the GHA bootstrap state) that creates one public hosted zone per spawn: zone_name is this app’s island (smoke-test: lattice.brendanprobst.com), not the personal apex brendanprobst.com.

Output route53_hosted_zone_id and name_servers. Import if the zone already exists — do not create a second zone for the same name.

envs/dev and envs/prod stay twins: when using this pattern they set manage_web_dns_in_route53 = true, create_route53_hosted_zone = false, and the same route53_hosted_zone_id. Refuse or document-loudly create_route53_hosted_zone = true in an env stack (that is a second zone).

Wire standup to apply dns-zone and print NS for the parent registrar. Path C (manage_web_dns_in_route53 = false) still works. Update route53-custom-domain.md with path D (per-spawn zone + NS delegation).

Do not apply against Fosterfolio’s fosterfolio.com zone. Do not refresh smoke-test in this phase.
```

### You do

1. Read the diff. Confirm the zone stack is not under `infra/terraform/envs/`.
2. Confirm nothing in the change would `terraform apply` Fosterfolio or smoke-test.
3. Commit on the same template branch as Phases 1–4.

**Pass:** dns-zone stack + path D docs exist in the template. `infra:fmt` / validate still pass. No live DNS change yet.

---

## Phase 6 — Refresh smoke-test, prove one-step on live dev

**Do not stand up prod until this is green.**

### You do

From the **template** checkout, on the commit that has Phases 1–5:

```bash
cd /Users/brendanprobst/github/lattice-app-template
npm run scaffold:refresh -- --into ../lattice-app-smoke-test
```

In **smoke-test**:

1. Refresh already ran `postRefreshPrompts` and `npm run ci`. Confirm docs look right (spawn names stay in `lattice-smoke-test-deploys.md`).
2. Commit the refresh in smoke-test.
3. Set `dns-zone` `zone_name = "lattice.brendanprobst.com"`. Run standup or apply that stack. Copy `name_servers`.
4. At **Google Domains**, add **NS** for `lattice.brendanprobst.com` only (not a nameserver change on `brendanprobst.com`). Wait until:

```bash
dig NS lattice.brendanprobst.com
```

matches the Route 53 nameservers.

5. Point **both** `envs/dev` and `envs/prod` tfvars at that `route53_hosted_zone_id`. `manage_web_dns_in_route53 = true`. `create_route53_hosted_zone = false`. Keep `web_custom_domain` as `dev.lattice.brendanprobst.com` on **dev**.
6. Run:

```bash
cd /Users/brendanprobst/github/lattice-app-smoke-test
npm run standup -- --env dev
```

Expect: folders/identity/role already present; DNS records land in the new zone; no new Google ACM `_hash` paste; Infisical outputs skip if unchanged.

7. Optional: move slugs from repo **secrets** to repo **variables** if standup did not. Leave client id/secret/role as secrets.
8. Dispatch **Deploy app** → `dev` (or `gh workflow run "Deploy app" --field environment=dev`).
9. Browse `https://dev.lattice.brendanprobst.com` (login / a page you already know).

### Agent prompt (only if refresh or standup breaks)

```text
Phase 6 of docs/plans/standup-automation.plan.md failed on lattice-app-smoke-test.
Treat live AWS/Infisical as source of truth. Make standup idempotent. Do not recreate lattice-smoke-test-gha-arn, a second ACM cert, or a second lattice.brendanprobst.com zone. Do not apply envs/prod. Do not change nameservers on brendanprobst.com.
```

**Pass:** one zone, NS delegated, standup `--env dev` exits 0, hostname unchanged, Deploy app green, dev URL still works.

---

## Phase 7 — Prod

Same command, new Terraform state.

### You do (before the agent)

1. Fill `infra/terraform/envs/prod/terraform.tfvars` (copy from `terraform.tfvars.example`). `environment = "prod"`. `web_custom_domain = "lattice.brendanprobst.com"`. **Same** `route53_hosted_zone_id` as dev. `manage_web_dns_in_route53 = true`. `create_route53_hosted_zone = false`. **Different** Supabase project than dev.
2. Fill `apps/web/.env.prod` (or `.env.production.local` if that is what this spawn uses) with that project’s URL/anon.
3. Copy `.lattice/standup.json.example` → `.lattice/standup.json` if needed. Put the new project’s `SUPABASE_DB_URL` in **`supabase/.env.prod`** (gitignored). Standup apply runs those SQL files after terraform; it does not use `supabase db push`.
4. Confirm GitHub `prod` environment exists and requires you as reviewer.
5. **New Supabase project Auth (required).** Follow [`google-sso.md`](google-sso.md) on **this** prod project (not `-dev`). Standup reprints the checklist. `deploy:check` fails if the laptop URL does not match `terraform.tfvars` or Google is off.

### Agent prompt (optional — standup should be enough)

```text
I am standing up lattice-app-smoke-test prod using npm run standup -- --env prod.
Walk me through leftover human steps only (reviewer). DNS is the Phase 5 zone. Do not modify envs/dev state. Do not reuse the dev Supabase project. Do not create a second Route 53 zone.
```

### You run

```bash
cd /Users/brendanprobst/github/lattice-app-smoke-test
npm run standup -- --env prod
```

Route 53 should validate ACM. If standup still prints path-C CNAMEs, the env tfvars are still on `manage_web_dns_in_route53 = false` — stop and fix that.

Then from **`main`**:

```bash
gh workflow run "Deploy app" --field environment=prod --ref main
```

Approve the environment. Browse `https://lattice.brendanprobst.com`. Re-check `https://dev.lattice.brendanprobst.com`.

**Pass:** prod stack names are `lattice-app-smoke-test-prod-*`. Same zone as dev. Dev still up. Deploy app prod green.

---

## If you get stuck (map to the old failures)

| Symptom | Phase that should have prevented it | Do this |
| --- | --- | --- |
| Infisical `401 Invalid credentials` | 1, 3 | Repo secrets `INFISICAL_CLIENT_ID` / `SECRET` from **Universal Auth**, not Identity ID. Timestamps must change after `gh secret set`. |
| `AssumeRoleWithWebIdentity` denied | 2 | `sub` is `repo:brendanprobst/lattice-app-smoke-test:*`, not a URL. |
| `lambda:GetFunctionConfiguration` denied | 2 | Role policy includes that action. |
| `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` | 4 | DNS hit CloudFront before alias/cert. Wait for Issued, then apply. |
| `InvalidViewerCertificate` | 4 | Cert still PENDING. `dig` the **printed** ACM CNAME. |
| Wrong `_hash` under `dev.lattice` | 4 | Use this cert’s outputs, not the apex token. |
| Two zones / ACM never Issued | 5, 6 | One zone `lattice.brendanprobst.com`. `dig NS` must match that zone. Do not `create_route53_hosted_zone` in `envs/*`. |
| Personal site or mail broke | 5, 6 | You changed nameservers on `brendanprobst.com`. Revert apex NS; only delegate `lattice`. |

---

## Suggested chat cadence

One chat per phase in the **template** repo (Phases 1–5). Phase 6 chat in **smoke-test** after refresh. Phase 7 in **smoke-test**. Do not mix a Phase 2 or Phase 5 apply with a Phase 7 prod apply in the same turn.

Mark YAML todos in `docs/plans/standup-automation.plan.md` as you complete each phase.
