# Deploy to AWS (Terraform + Lambda + static web)

Two ways to deploy:

1. **Laptop:** **`npm run deploy:aws`** (your AWS credentials and `infra/terraform/envs/<env>/terraform.tfvars`). **`--env`** defaults to **`dev`**. This is the path that runs Terraform.
2. **GitHub Actions:** workflow **Deploy app** for site and Lambda updates. Manual only. It does not run Terraform.

The laptop script order is: **build API Lambda bundle → `terraform apply` → ACM wait (registrar path) → second apply for CloudFront alias/cert + CORS when ISSUED → SQL files in `.lattice/standup.json` for that env → read `api_url` → build static web with `NEXT_PUBLIC_API_URL` → `aws s3 sync`**. `--plan-only` and `deploy:aws:web` skip SQL. See [Supabase migrations](playbooks/supabase-migrations.md#standup-apply).

When `web_custom_domain` is set and `manage_web_dns_in_route53 = false`, the script prints **this certificate’s** site CNAME (`<domain>` → `web_cloudfront_domain`) and ACM validation CNAME (`acm_validation_record_name` → `acm_validation_record_value`). It polls ACM in `us-east-1` until **ISSUED**, then applies the CloudFront alias/cert and Lambda `CORS_ORIGINS`. If the poll times out, it exits with those records and **re-run after Issued**. Do not copy another hostname’s `_hash`. Tune wait with `ACM_WAIT_INTERVAL_SEC` and `ACM_WAIT_TIMEOUT_SEC` (default 30s / 12 min).

The template repo itself is not deployed. After `npm run scaffold`, the spawn owns Infisical folders `/<app-slug>/{shared,flags,sensitive}` in the shared `lattice` project. See [`docs/playbooks/infisical-github-deploys.md`](playbooks/infisical-github-deploys.md).

## Prerequisites

- **AWS CLI** and credentials that can run Terraform and S3 sync (`aws sts get-caller-identity`).
- **Terraform** `>= 1.6`.
- **`terraform.tfvars`** in `infra/terraform/envs/<env>/` (copy from `terraform.tfvars.example`). Do not commit secrets. Default env is **`dev`**. `envs/prod` ships so `--env prod` works. CI validates `envs/dev`, the GHA role stack `infra/terraform/bootstrap`, and `infra/terraform/dns-zone` (not `--env` targets for `deploy:aws`).
- For a laptop **web** build: **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** must be in the env file. **`dev`** loads the first of **`apps/web/.env.dev`**, **`.env.local`**, **`.env`** and does **not** overwrite a `NEXT_PUBLIC_*` already set in the shell. Any other **`--env`** loads only **`apps/web/.env.<env>`** and overwrites those keys. `infisical run` needs **`--path=/<app-slug>/shared`** or it does not see vault keys. GitHub **Deploy app** reads those keys from Infisical instead.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run standup -- --env dev` | Infisical folders + identity + GitHub env/vars/secrets + GHA role + per-spawn Route 53 zone (prints NS), then laptop `deploy:aws` for that env. `--bootstrap-only` skips the env apply. Same with `--env prod`. Path C skips `dns-zone`. |
| `npm run deploy:aws` | Full deploy of **`envs/dev`** (interactive `terraform apply` when in a TTY). |
| `npm run deploy:aws -- --env prod` | Same pipeline against **`infra/terraform/envs/prod`**. Web build requires **`apps/web/.env.prod`**. |
| `npm run deploy:check -- --env <dev|prod>` | Read-only health check (Terraform, AWS, DNS, Infisical names, GitHub, laptop files, Supabase URL pair + Auth settings). Empty S3 / missing site is a warning. Google SSO leftovers: [google-sso.md](playbooks/google-sso.md). |
| `npm run deploy:aws -- --skip-web` | Lambda + Terraform only (no static build, no S3 sync). |
| `npm run deploy:aws -- --skip-api-build` | Reuse existing `apps/api/dist-lambda` (still runs Terraform + web). |
| `npm run deploy:aws -- --auto-approve` | Non-interactive apply (required in CI and headless shells). |
| `npm run deploy:aws:web` | Static web only for `envs/dev`: build, S3 sync, CloudFront invalidation (no Lambda build, no `terraform apply`). |
| `npm run deploy:aws:web -- --env prod` | Static web only against prod Terraform outputs. |
| `npm run infisical:sync-outputs -- --env <env>` | Write bucket, distribution, Lambda name, and API URL from Terraform state into Infisical `/<app-slug>/shared`. |

Always pass **`--auto-approve`** for non-interactive full deploys.

## Laptop deploy with Infisical

After `infisical login` in a spawn, copy `.lattice/infisical.json.example` to `.lattice/infisical.json` and set `appSlug`. Keep `apps/web/.env.local` (or `.env.dev`) **and** `apps/web/.env.prod` on disk from day 1. The deploy script reads those files. `infisical run` without `--path=/<app-slug>/shared` does not see vault keys under the app folder.

```bash
npm run deploy:aws
npm run deploy:aws -- --env prod
infisical run --env=dev --path=/<app-slug>/shared -- npm run deploy:aws
```

`dev` does not overwrite a `NEXT_PUBLIC_*` already set in the shell. `prod` reads only `apps/web/.env.prod` and overwrites those keys. The script prints the Supabase host and the API host before the web build. After a successful apply, it writes `WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, and `NEXT_PUBLIC_API_URL` to Infisical `/<app-slug>/shared` for that environment. If those four keys already match, it logs `skip Infisical output sync (unchanged)`. That write uses your Infisical login. GitHub Actions does not run it.

If the Infisical CLI is missing or the write fails, the deploy still finishes. Re-run `npm run infisical:sync-outputs -- --env <env>`. Keep `terraform.tfvars` on disk; Terraform still reads the service role from that file.

## Deploy the site and Lambda without Terraform

Workflow: **`.github/workflows/deploy-app.yml`** (**Actions → Deploy app → Run workflow**). Manual only. It does not apply Terraform and does not read `terraform.tfstate`.

Pick `dev` or `prod`. That name is the Infisical `env-slug` and the GitHub environment (prod reviewer). App secrets do **not** live on those environments. Any branch can deploy **dev**. **Prod** only runs from **`main`**. `/<app-slug>/flags` is optional; missing flags stay off.

The job reads Supabase keys, optional feature flags, and the Terraform outputs (`WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, `NEXT_PUBLIC_API_URL`) from Infisical `/<app-slug>/shared` and `/<app-slug>/flags`. `npm run infisical:sync-outputs` writes those outputs after a laptop apply. Put `INFISICAL_PROJECT_SLUG` and `INFISICAL_APP_SLUG` as repository **variables** (secrets still accepted as fallback). Put the Infisical identity and `AWS_ROLE_ARN` as repository **secrets**. Setup: [`docs/playbooks/infisical-github-deploys.md`](playbooks/infisical-github-deploys.md).

The older **Deploy (AWS)** workflow (`.github/workflows/deploy-aws.yml`) stays in the repo as the unused Terraform-in-GHA path. Do not run it.

## See also

- [`infra/terraform/README.md`](../infra/terraform/README.md) — AWS account setup, cost controls.
- [`docs/playbooks/route53-custom-domain.md`](playbooks/route53-custom-domain.md) — Custom domain, Route 53, ACM, and registrar nameserver steps.
- [`docs/plans/smoke_test_deployment_guide.plan.md`](plans/smoke_test_deployment_guide.plan.md) — Post-deploy smoke checks.
