# Infisical and GitHub deploys

Generic steps for every Lattice spawn. The template repo itself is **not** deployed and must not get an Infisical folder. After `npm run scaffold`, fill `<app-slug>` (same string as `.lattice/infisical.json` `appSlug` and GitHub `INFISICAL_APP_SLUG`).

Automation of the human steps below (GitHub secrets, GHA role, ACM wait, one laptop command) is [standup automation](standup-automation.md) — implement in this order: [`docs/plans/standup-automation.plan.md`](../plans/standup-automation.plan.md). Until that ships, this playbook is still the manual path.

**Default posture: two environments.** Day 1 stands up **dev** and leaves **prod** one dispatch away. Create both Infisical folders, both GitHub environments, both Terraform `tfvars`, and both web env files in the same sitting. Apply and smoke **dev** first. The first prod apply and **Deploy app** run should be a formality — same commands, prod values, prod approval — not a second architecture project.

One Infisical organization holds **one project** named `lattice`. Apps are not separate Infisical projects. Isolate an app under `/<app-slug>/**`. GitHub **Deploy app** points at the **`lattice` project slug** and reads only `/<app-slug>/shared` (required) and `/<app-slug>/flags` (optional). It never reads `/sensitive`.

## Vault layout

| Thing | Value |
| --- | --- |
| Infisical project | `lattice` (one project for every Lattice app) |
| Infisical project slug | from the URL after you open the **lattice** project, `…/project/<slug>/…` — not the org name, not the UUID |
| App folders | `/<app-slug>/shared`, `/<app-slug>/flags`, `/<app-slug>/sensitive` |
| Environments | `dev` and `prod` (same names in Infisical, GitHub, and `infra/terraform/envs/<env>`) |
| Laptop app slug | `.lattice/infisical.json` → `{ "appSlug": "<app-slug>" }` (copy from `.lattice/infisical.json.example`) |
| GitHub (repo, once) | Variables `INFISICAL_PROJECT_SLUG` and `INFISICAL_APP_SLUG`. Secrets `INFISICAL_CLIENT_ID` / `INFISICAL_CLIENT_SECRET` / `AWS_ROLE_ARN`. Not copied onto each environment. Not `INFISICAL_PROJECT_ID`. |
| Prod GitHub deploys from | `main` |

`dev` and `prod` both have the same key names, with different values. Inside one environment, put this app’s keys only under `/<app-slug>/**`:

- `/<app-slug>/shared` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, plus the four Terraform outputs
- `/<app-slug>/flags` — optional app-specific `NEXT_PUBLIC_*` flags. Missing flags stay off (`continue-on-error`)
- `/<app-slug>/sensitive` — laptop-only keys such as `SUPABASE_DB_URL`. No GitHub identity gets this folder

**Deploy app** reads `/<app-slug>/shared` and `/<app-slug>/flags`. A key at `/` or `/shared` is invisible to that job. Do not import `/<app-slug>/sensitive` into the other folders. Do not paste a whole `.env`. Pass `--path` and only the keys for that folder.

`WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, and `NEXT_PUBLIC_API_URL` go in `/<app-slug>/shared` via `npm run infisical:sync-outputs`, not from a `.env`.

`.infisical.json` from `infisical init` is gitignored. Do not commit it. Spawns commit `.lattice/infisical.json` (the slug is not a secret). The template does not. Refresh always restores `.lattice/infisical.json`. If a spawn fills names into this playbook, list the path in `.lattice/refresh.json` `preservePaths` or those names are overwritten.

## Day 1 — both environments

Do this once per spawn. **Apply and browse dev** before you apply prod.

| Day 1 (both envs) | After that (dev first, then prod) |
| --- | --- |
| Infisical folders `/<app-slug>/{shared,flags,sensitive}` in **dev** and **prod** | Laptop `terraform apply` for `envs/dev`, smoke the dev URL |
| Paste Supabase URL/anon (and flags) for **both** Infisical envs | `npm run infisical:sync-outputs -- --env dev` |
| `apps/web/.env.local` (or `.env.dev`) **and** `apps/web/.env.prod` | GitHub **Deploy app** → `dev` |
| `infra/terraform/envs/dev/terraform.tfvars` **and** `envs/prod/terraform.tfvars` | When you are ready: apply `envs/prod`, sync `--env prod`, **Deploy app** → `prod` from `main` |
| GitHub environments `dev` and `prod` (prod requires a reviewer; secrets live on the repo) | Prod approval click is the remaining human step |
| **This spawn’s** Infisical machine identity + **this spawn’s** AWS OIDC role (`<app-slug>-gha`) for both stacks | |

`envs/prod` ships in the template. Fill `terraform.tfvars` and `.env.prod` on day 1 even if you do not apply prod until later. Changing `environment` on an existing state from `dev` to `prod` recreates AWS resources (`name_prefix` includes the env name). Always use a **new** `envs/prod` state for the prod stack.

## Human playbook

### 1. Use the existing Lattice project

1. Open [https://app.infisical.com](https://app.infisical.com).
2. Use the existing **`lattice`** project. Do not create a second Infisical project per app.
3. The next app copies `/<existing-app>/**` to `/<app-slug>/**` and changes values.

### 2. Create the app folders and paste secrets

1. In the `lattice` project, keep environments `dev` and `prod`.
2. In **both** `dev` and `prod`, create `/<app-slug>/shared`, `/<app-slug>/flags`, and `/<app-slug>/sensitive`. Use `--path` on every `infisical secrets set`.
3. Paste that environment’s Supabase URL and anon key into `/<app-slug>/shared`. Prod must be a **different** Supabase project than dev.
4. Paste only the `NEXT_PUBLIC_*` flags this app uses into `/<app-slug>/flags`.
5. Paste laptop-only values such as `SUPABASE_DB_URL` into `/<app-slug>/sensitive`.
6. Leave the four Terraform outputs for the laptop sync after each env’s first `terraform apply`.

```bash
infisical secrets set \
  NEXT_PUBLIC_SUPABASE_URL='https://YOUR_DEV_REF.supabase.co' \
  NEXT_PUBLIC_SUPABASE_ANON_KEY='your-dev-anon-key' \
  --env=dev --path=/<app-slug>/shared --projectId=<project id>

infisical secrets set \
  NEXT_PUBLIC_SUPABASE_URL='https://YOUR_PROD_REF.supabase.co' \
  NEXT_PUBLIC_SUPABASE_ANON_KEY='your-prod-anon-key' \
  --env=prod --path=/<app-slug>/shared --projectId=<project id>
```

### 3. Read the secrets from your laptop

1. Install the Infisical CLI from [https://infisical.com/docs/cli/overview](https://infisical.com/docs/cli/overview).
2. In the spawn repo, run `infisical login` and choose the `lattice` project.
3. Run `infisical init` at the repo root so `.infisical.json` holds the `lattice` project id. Do not commit it. Do not init inside `infra/terraform/envs/*`.
4. Copy `.lattice/infisical.json.example` to `.lattice/infisical.json` and set `appSlug` to the same string as `INFISICAL_APP_SLUG`.
5. On the Infisical project settings page, copy the project id (laptop CLI `--projectId` only) and the project slug (GitHub **variable** `INFISICAL_PROJECT_SLUG`). Do not put the project UUID on GitHub.
6. Confirm:

```bash
infisical secrets --projectId=<project id> --env=dev --path=/<app-slug>/shared
```

### 4. Create the machine identity GitHub will use

1. `lattice` project → Access Control → Machine Identities → create **one identity per spawn** (read-only), named like `github-<app-slug>`.
2. Grant that identity read on `dev` and `prod` for **this app only**: `/<app-slug>/shared` and `/<app-slug>/flags`.
3. Do not grant `/<app-slug>/sensitive`. Do not add this app’s folders onto Fosterfolio’s (or any other) identity. Identities are cheap; folder ACLs on one token are not.
4. Turn on universal auth and save the client id and client secret in a password manager.

### 5. Create the AWS role

1. IAM → Identity providers. Add `token.actions.githubusercontent.com` with audience `sts.amazonaws.com` if it is not already there. The **provider** is the only account-wide piece. Reuse it. Terraform looks it up; it does not create a second provider.
2. From the spawn repo, apply `infra/terraform/bootstrap` (own state — not `envs/dev` or `envs/prod`). That creates **one** role named `<app-slug>-gha`. Trust is `repo:<org>/<spawn>:*` only. Do not paste a GitHub URL into `github_owner` / `github_repo`. Do not reuse or rename `fosterfolio-gha-arn`. Do not make a `lattice-ecosystem-gha` role that every repo assumes.
3. The role allows S3 sync on `<project>-dev-web` / `<project>-prod-web`, CloudFront invalidation, and Lambda `UpdateFunctionCode` / `GetFunction` / `GetFunctionConfiguration` on `<project>-dev-api` / `<project>-prod-api`.
4. Output `aws_role_arn` is the repository secret `AWS_ROLE_ARN`. The role cannot apply Terraform.
5. **Smoke-test:** the live role is already `lattice-smoke-test-gha-arn`. Set `role_name` and **import** it — do not create `lattice-smoke-test-gha`. Steps: [`infra/terraform/bootstrap/README.md`](../../infra/terraform/bootstrap/README.md).

### 6. GitHub repository variables and secrets (once) and environments (approval only)

The identity, role, and slugs are the same for `dev` and `prod`. Put them **once** on the repo. Do not paste the same values onto each environment.

Repo → Settings → Secrets and variables → **Actions**:

1. Repository **variables** (once, not on each environment):
   - `INFISICAL_PROJECT_SLUG` (slug of the **lattice** project from `…/project/<slug>/…`. Not the org name. Not the project UUID.)
   - `INFISICAL_APP_SLUG` (lowercase slug, e.g. `your-app`)
   - `AWS_REGION` (optional; default is `us-east-1`)
2. Repository **secrets** (once, not on each environment):
   - `INFISICAL_CLIENT_ID`
   - `INFISICAL_CLIENT_SECRET`
   - `AWS_ROLE_ARN`
3. Secrets are still accepted as a fallback for the two slugs (`vars.*` then `secrets.*`) if a spawn has not moved them yet.
4. Do not set `INFISICAL_PROJECT_ID` on GitHub. That UUID is for the laptop CLI (`--projectId`). **Deploy app** uses the project slug.
5. Leave the Supabase keys, `TERRAFORM_TFVARS`, and the Terraform outputs out of GitHub.

Repo → Settings → Environments:

1. Create `dev` and `prod` on day 1. The job still selects one so Infisical `env-slug` matches.
2. On `prod`, require a reviewer. That is the only reason `prod` is an environment.
3. Do not add the secrets or slugs here unless you need a one-off override.

### 7. Laptop deploy (dev first)

Laptop web builds read **`apps/web/.env.*`**, not Infisical, unless you pass `--path`. `infisical run` without `--path` looks at `/`, so it will not see `/<app-slug>/shared`.

```bash
# Optional wrap — must include --path or it does nothing useful:
infisical run --projectId=<project id> --env=dev --path=/<app-slug>/shared -- npm run deploy:aws

# Usual path: env files on disk, then apply + sync
npm run deploy:aws
npm run infisical:sync-outputs -- --env dev
```

`dev` loads the first of `apps/web/.env.dev`, `.env.local`, `.env`. A `NEXT_PUBLIC_*` already set in the shell is **not** overwritten by that file. Any other `--env` (including `prod`) reads **only** `apps/web/.env.<env>` and overwrites `NEXT_PUBLIC_*` so a dev file cannot leak into that build.

After the first prod apply (when you are ready, not on day 1 unless you want it live):

```bash
npm run deploy:aws -- --env prod
npm run infisical:sync-outputs -- --env prod
```

Keep `terraform.tfvars` on disk; Terraform still reads the service role from that file. If the Infisical CLI is missing or the write fails, the deploy still finishes — re-run `npm run infisical:sync-outputs -- --env <env>`.

## What you run after the steps above

`.github/workflows/deploy-app.yml` is the GitHub path. Do not dispatch it until the matching GitHub environment exists (empty is fine) and `/<app-slug>/shared` has the four Terraform outputs for **that** Infisical environment.

1. Actions → **Deploy app** → Run workflow. Any branch can deploy **dev**. **Prod** only runs from **`main`**.
2. The job selects the GitHub environment of the same name (prod reviewer). It assumes the **repository** `AWS_ROLE_ARN`, loads `/<app-slug>/shared` (required) and `/<app-slug>/flags` (optional) from Infisical, uploads the static site, invalidates CloudFront, and updates the Lambda zip.
3. It does not run Terraform and does not read `terraform.tfstate`.
4. The log prints the Supabase host and the API host. Confirm the host before the first prod run.
5. Terraform apply stays on the laptop (`npm run deploy:aws`). GitHub only runs **Deploy app**.

The older **Deploy (AWS)** workflow (`.github/workflows/deploy-aws.yml`) stays in the repo as the unused Terraform-in-GHA path. Do not run it.

Remote Terraform state, then Terraform in GitHub, is a follow-up. Template backlog item F5.

## Adding a hostname or a later environment

Custom domains are per Terraform env (`web_custom_domain` in that env’s `tfvars`). See [`docs/playbooks/route53-custom-domain.md`](route53-custom-domain.md). Changing the domain on an existing state retargets that stack (downtime on the old name is expected). Do not change `environment` in tfvars on a live state to “promote” it — apply `envs/prod` instead.

A third env (`stage`) is a copy of `envs/prod` plus matching Infisical and GitHub environment names. Not required on day 1.
