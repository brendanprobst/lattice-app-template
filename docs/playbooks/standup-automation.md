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

Still typed by a human: Supabase URL/anon (once), registrar CNAMEs if DNS is not Route 53, prod approval.

## Ground rules

- Implement in the **template**. Refresh into smoke-test. Do not hand-port files.
- One Infisical project (`lattice` / `lattice-ecosystem-7iyf`). One identity and one AWS role **per spawn**.
- Do not put secrets on GitHub environments. Do not grant `/sensitive` to GitHub.
- Do not apply Terraform in GitHub. **Deploy app** = site + Lambda. Laptop = Terraform + first cert.
- Do not change `environment` in live `envs/dev` tfvars to `prod`.
- Do not touch `fosterfolio-gha-arn`.
- Commit in the template when a phase is done. Refresh only after Phase 4 (or after Phase 1 if you want an early smoke-test workflow fix — optional).

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
| DNS | Google Domains (`manage_web_dns_in_route53 = false`) |

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
2. Merge or commit on template `main` (or a branch you keep for all six phases).

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

1. From **smoke-test** (or a worktree), apply bootstrap **only** if the agent did not, after you review the plan.
2. Prefer **import** of `lattice-smoke-test-gha-arn` over create.
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

In **smoke-test** (after a refresh, or by running the script from template with `--into` only if the agent says so — prefer refresh in Phase 5). Until Phase 5, you can run a dry check from the template against smoke-test **only if** the script is built to take `--repo`. Otherwise wait for Phase 5.

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

## Phase 5 — Refresh smoke-test, prove one-step on live dev

**Do not stand up prod until this is green.**

### You do

From the **template** checkout, on the commit that has Phases 1–4:

```bash
cd /Users/brendanprobst/github/lattice-app-template
npm run scaffold:refresh -- --into ../lattice-app-smoke-test
```

In **smoke-test**:

1. Follow `.lattice/refresh.json` `postRefreshPrompts` (overwritten docs only; spawn names stay in `lattice-smoke-test-deploys.md`).
2. Commit the refresh in smoke-test.
3. Run:

```bash
cd /Users/brendanprobst/github/lattice-app-smoke-test
npm run standup -- --env dev
```

Expect a no-op: folders exist, identity exists, role imported, cert already Issued, Infisical outputs unchanged.

4. Optional: move slugs from repo **secrets** to repo **variables** if standup did not (script should). Leave client id/secret/role as secrets.
5. Dispatch **Deploy app** → `dev` (or `gh workflow run "Deploy app" --field environment=dev`).
6. Browse `https://dev.lattice.brendanprobst.com` (login / a page you already know).

### Agent prompt (only if refresh or standup breaks)

```text
Phase 5 of docs/plans/standup-automation.plan.md failed on lattice-app-smoke-test.
Treat live AWS/Infisical as source of truth. Make standup idempotent. Do not recreate lattice-smoke-test-gha-arn or a second ACM cert. Do not apply envs/prod.
```

**Pass:** standup `--env dev` exits 0 without changing the live hostname. Deploy app green. Dev URL still works.

---

## Phase 6 — Prod

Same command, new Terraform state.

### You do (before the agent)

1. Fill `infra/terraform/envs/prod/terraform.tfvars` (copy from `terraform.tfvars.example`). `environment = "prod"`. `web_custom_domain = "lattice.brendanprobst.com"`. `manage_web_dns_in_route53 = false` (same registrar story as dev). **Different** Supabase project than dev.
2. Fill `apps/web/.env.prod` (or `.env.production.local` if that is what this spawn uses) with that project’s URL/anon.
3. Confirm GitHub `prod` environment exists and requires you as reviewer.

### Agent prompt (optional — standup should be enough)

```text
I am standing up lattice-app-smoke-test prod using npm run standup -- --env prod.
Walk me through leftover human steps only (ACM CNAMEs, reviewer). Do not modify envs/dev state. Do not reuse the dev Supabase project.
```

### You run

```bash
cd /Users/brendanprobst/github/lattice-app-smoke-test
npm run standup -- --env prod
```

If ACM is pending, add **only** the CNAMEs standup printed (site + `_hash` for **prod** / apex). Wait until Issued. Re-run standup / `deploy:aws -- --env prod` as the script says.

Then from **`main`**:

```bash
gh workflow run "Deploy app" --field environment=prod --ref main
```

Approve the environment. Browse `https://lattice.brendanprobst.com`. Re-check `https://dev.lattice.brendanprobst.com`.

**Pass:** prod stack names are `lattice-app-smoke-test-prod-*`. Dev still up. Deploy app prod green.

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

---

## Suggested chat cadence

One chat per phase in the **template** repo (Phases 1–4). Phase 5 chat in **smoke-test** after refresh. Phase 6 in **smoke-test**. Do not mix a Phase 2 apply with a Phase 6 prod apply in the same turn.

Mark YAML todos in `docs/plans/standup-automation.plan.md` as you complete each phase.
