# Deploy to AWS (Terraform + Lambda + static web)

Two ways to deploy:

1. **Laptop:** **`npm run deploy:aws`** (your AWS credentials and `infra/terraform/envs/<env>/terraform.tfvars`). **`--env`** defaults to **`dev`**. This is the path that runs Terraform.
2. **GitHub Actions:** workflow **Deploy app** for site and Lambda updates. Manual only. It does not run Terraform.

The laptop script order is: **build API Lambda bundle → `terraform apply` → read `api_url` → build static web with `NEXT_PUBLIC_API_URL` → `aws s3 sync`**.

The template repo itself is not deployed. After `npm run scaffold`, the spawn owns Infisical folders `/<app-slug>/{shared,flags,sensitive}` in the shared `lattice` project. See [`docs/playbooks/infisical-github-deploys.md`](playbooks/infisical-github-deploys.md).

## Prerequisites

- **AWS CLI** and credentials that can run Terraform and S3 sync (`aws sts get-caller-identity`).
- **Terraform** `>= 1.6`.
- **`terraform.tfvars`** in `infra/terraform/envs/<env>/` (copy from `terraform.tfvars.example`). Do not commit secrets. Default env is **`dev`**. `envs/prod` ships so `--env prod` works; CI still validates only `envs/dev`.
- For a laptop **web** build: **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** must be in the env file. **`dev`** loads the first of **`apps/web/.env.dev`**, **`.env.local`**, **`.env`** and does **not** overwrite a `NEXT_PUBLIC_*` already set in the shell. Any other **`--env`** loads only **`apps/web/.env.<env>`** and overwrites those keys. `infisical run` needs **`--path=/<app-slug>/shared`** or it does not see vault keys. GitHub **Deploy app** reads those keys from Infisical instead.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run deploy:aws` | Full deploy of **`envs/dev`** (interactive `terraform apply` when in a TTY). |
| `npm run deploy:aws -- --env prod` | Same pipeline against **`infra/terraform/envs/prod`**. Web build requires **`apps/web/.env.prod`**. |
| `npm run deploy:aws -- --plan-only` | `terraform init` + `terraform plan` only. |
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

`dev` does not overwrite a `NEXT_PUBLIC_*` already set in the shell. `prod` reads only `apps/web/.env.prod` and overwrites those keys. The script prints the Supabase host and the API host before the web build. After a successful apply, it writes `WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, and `NEXT_PUBLIC_API_URL` to Infisical `/<app-slug>/shared` for that environment. That write uses your Infisical login. GitHub Actions does not run it.

If the Infisical CLI is missing or the write fails, the deploy still finishes. Re-run `npm run infisical:sync-outputs -- --env <env>`. Keep `terraform.tfvars` on disk; Terraform still reads the service role from that file.

## Deploy the site and Lambda without Terraform

Workflow: **`.github/workflows/deploy-app.yml`** (**Actions → Deploy app → Run workflow**). Manual only. It does not apply Terraform and does not read `terraform.tfstate`.

Pick `dev` or `prod`. The job uses the GitHub environment of the same name, so a dev run cannot read prod secrets. Any branch can deploy **dev**. **Prod** only runs from **`main`**. `/<app-slug>/flags` is optional; missing flags stay off.

Secrets and variables for that environment are listed in [`docs/playbooks/infisical-github-deploys.md`](playbooks/infisical-github-deploys.md). The job reads Supabase keys, optional feature flags, and the Terraform outputs (`WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, `NEXT_PUBLIC_API_URL`) from Infisical `/<app-slug>/shared` and `/<app-slug>/flags`. `npm run infisical:sync-outputs` writes those outputs after a laptop apply. The GitHub variables are `INFISICAL_PROJECT_SLUG` and `INFISICAL_APP_SLUG`.

The older **Deploy (AWS)** workflow (`.github/workflows/deploy-aws.yml`) stays in the repo as the unused Terraform-in-GHA path. Do not run it.

## See also

- [`infra/terraform/README.md`](../infra/terraform/README.md) — AWS account setup, cost controls.
- [`docs/playbooks/route53-custom-domain.md`](playbooks/route53-custom-domain.md) — Custom domain, Route 53, ACM, and registrar nameserver steps.
- [`docs/plans/smoke_test_deployment_guide.plan.md`](plans/smoke_test_deployment_guide.plan.md) — Post-deploy smoke checks.
