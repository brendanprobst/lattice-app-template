# Deploy to AWS (Terraform + Lambda + static web)

Two ways to deploy:

1. **Local / CI runner:** **`npm run deploy:aws`** (uses your AWS credentials and `infra/terraform/envs/dev/terraform.tfvars`).
2. **GitHub Actions:** workflow **Deploy (AWS)** — **Actions → Deploy (AWS) → Run workflow** (manual only, `main` only).

The script order is: **build API Lambda bundle → `terraform apply` → read `api_url` → build static web with `NEXT_PUBLIC_API_URL` → `aws s3 sync`**.

## Prerequisites

- **AWS CLI** and credentials that can run Terraform and S3 sync (`aws sts get-caller-identity`).
- **Terraform** `>= 1.6`.
- **`terraform.tfvars`** in `infra/terraform/envs/dev/` (copy from `terraform.tfvars.example`). Do not commit secrets.
- For the **web** build: **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** in the environment or in **`apps/web/.env.local`** / **`apps/web/.env.production.local`** (the deploy script loads those files if present).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run deploy:aws` | Full deploy (interactive `terraform apply` when in a TTY). |
| `npm run deploy:aws -- --plan-only` | `terraform init` + `terraform plan` only. |
| `npm run deploy:aws -- --skip-web` | Lambda + Terraform only (no static build, no S3 sync). |
| `npm run deploy:aws -- --skip-api-build` | Reuse existing `apps/api/dist-lambda` (still runs Terraform + web). |
| `npm run deploy:aws -- --auto-approve` | Non-interactive apply (required in CI and headless shells). |

**CI / automation:** always pass **`--auto-approve`**.

## GitHub Actions (OIDC)

Workflow: **`.github/workflows/deploy-aws.yml`**. It runs only when you trigger it manually; it does **not** run on every commit.

### 1. IAM OIDC trust for GitHub

Create an IAM role that trusts **`sts:AssumeRoleWithWebIdentity`** for your GitHub org/repo (see [GitHub OIDC on AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)). Attach policies that allow Terraform to manage this stack and S3 sync to the web bucket.

### 2. Repository secrets / variables

| Name | Required | Purpose |
|------|----------|---------|
| **`AWS_DEPLOY_ROLE_ARN`** | Yes | ARN of the OIDC role (e.g. `arn:aws:iam::123456789012:role/github-deploy-lattice`). |
| **`TERRAFORM_TFVARS`** | Yes | **Full** contents of your `terraform.tfvars` (multiline). |
| **`NEXT_PUBLIC_SUPABASE_URL`** | For full web deploy | Same as local web build. |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | For full web deploy | Same as local web build. |
| **`AWS_REGION`** | — | The workflow pins **`us-east-1`** for `configure-aws-credentials`; keep **`aws_region`** in `terraform.tfvars` consistent (change both if you use another region). |

If **`NEXT_PUBLIC_*`** secrets are missing and you did not skip web, the workflow may still run if those values exist inside the loaded `.env` files in the repo (they usually should **not** be committed).

### 3. Run

**Actions → Deploy (AWS) → Run workflow** (branch **main**). Optional: **Skip web** to deploy API + infra only.

### 4. Remote Terraform state

If you enable an **S3 backend** in `infra/terraform/envs/dev/versions.tf`, the OIDC role needs **S3/DynamoDB** permissions for state, and the first run may need `terraform init -migrate-state` locally before CI can apply.

## See also

- [`infra/terraform/README.md`](../infra/terraform/README.md) — AWS account setup, cost controls.
- [`docs/playbooks/route53-custom-domain.md`](playbooks/route53-custom-domain.md) — Custom domain, Route 53, ACM, and registrar nameserver steps.
- [`docs/plans/smoke_test_deployment_guide.plan.md`](plans/smoke_test_deployment_guide.plan.md) — Post-deploy smoke checks.