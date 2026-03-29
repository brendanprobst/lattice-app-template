# Terraform (Lattice)

Modular layout for **AWS** plus optional **Supabase credentials in config**: you define Supabase values in `terraform.tfvars`, and Terraform can mirror them into **SSM Parameter Store** for Lambdas, ECS, or CI to read with IAM.

**Provider lockfile:** this repo commits **`envs/dev/.terraform.lock.hcl`** (not gitignored). After you change providers or run `terraform init` and the lockfile updates, **commit the lockfile** so CI (`terraform fmt` / `validate`) and every machine resolve the same provider versions.

## Layout

- `modules/supabase_ssm` — Writes Supabase URL/keys from tfvars into SSM (SecureString where appropriate).
- `envs/dev` — Example root: `locals` for tags + `name_prefix`; add more modules or `envs/prod` as needed.

Extract shared **tag** or **naming** logic into new modules under `modules/` when you add a second environment or stack.

## Connecting your AWS account (for deployment)

There is **no automatic “link GitHub to AWS”** in this template. **Deployment** means: Terraform and the AWS CLI run with **credentials** that are allowed to create and update resources in **your** AWS account. The **repository** only holds Terraform code; **connection** = **IAM identity + credential chain** on the machine or CI runner that runs `terraform apply` and `aws s3 sync`.

### 1. Create or choose an AWS account

Use a dedicated account or sub-account for **non-prod** smoke where you accept small spend. Turn on **billing alerts** and (optional) **cost allocation tags** if you use budget filters from this stack.

### 2. Local development: authenticate the AWS CLI

Terraform uses the **same credential chain** as the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html). Pick one approach:

| Approach | When to use |
|----------|-------------|
| **`aws configure`** | Long-lived **IAM user** access keys on a **dev machine only** (never commit keys; rotate if leaked). |
| **`aws configure sso`** | **IAM Identity Center** (SSO) — short-lived creds; recommended for teams. |
| **Environment variables** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optional `AWS_SESSION_TOKEN` for **assumed roles** or CI that injects secrets. |
| **Profile** | Set `AWS_PROFILE` to a named profile from `~/.aws/credentials` / `config`. |

Set a **default region** (or pass `-var`/provider config) so resources land where you expect (`terraform.tfvars` also sets `aws_region`).

**Sanity check** (should print your account and ARN):

```bash
aws sts get-caller-identity
```

### 3. IAM permissions (Terraform)

Terraform needs permission to create/update everything this stack defines (Lambda, API Gateway, S3, CloudFront, IAM roles for Lambdas, SSM parameters, budgets, etc.). For a **personal sandbox**, many teams use an **administrator-equivalent** role **only in that account**. For stricter orgs, generate a **custom policy** from `terraform plan` / your review process and attach least privilege—this template does not ship a minimal IAM policy JSON.

**Never** commit access keys, session tokens, or `terraform.tfvars` with secrets.

### 4. Remote Terraform state (S3 backend) — optional but recommended for teams

If you uncomment the **`backend "s3"`** block in `envs/dev/versions.tf`, the **same** credentials (or a narrower **state** role) must be allowed to:

- Read/write the **state object** in S3
- **Lock** state via the **DynamoDB** table you name in `backend`

Create the bucket and table **once** (often manually or a tiny bootstrap stack), then configure the backend and run `terraform init -migrate-state` when moving from local state.

### 5. GitHub Actions (optional): deploy from CI without long-lived keys

This repo’s default **CI** job does **not** deploy to AWS (`terraform validate` uses `-backend=false` and needs no cloud credentials). For a **manual** deploy from GitHub (OIDC, no long-lived keys in secrets), use the **Deploy (AWS)** workflow and **`npm run deploy:aws`** — see **[`docs/deploy-aws.md`](../../docs/deploy-aws.md)**.

In AWS, create an **IAM role** whose **trust policy** allows `sts:AssumeRoleWithWebIdentity` for your **repository** (narrow by `sub` / environment as needed). References: [GitHub OIDC with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services), [AWS IAM OIDC provider for GitHub](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html).

Keep **Terraform state**, **tfvars**, and **AWS account IDs** out of public logs; mask outputs in Actions.

### 6. After credentials work

Continue with **[First run (local)](#first-run-local)** below (`terraform init` → `plan` → `apply`). The **`aws` CLI** is also used for **`aws s3 sync`** after the web static build.

## First run (local)

```bash
cd /path/to/repo
npm run api:build:lambda
npm run web:build:static

cd infra/terraform/envs/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with real Supabase + AWS settings

terraform init
terraform plan
terraform apply
```

Use a **remote S3 backend** for anything shared or production; see commented block in `versions.tf`. Local state is acceptable for a **personal smoke** only—switch before team or production workflows.

## CI

Root `npm run infra:fmt` and `npm run infra:validate` (no AWS credentials required; validate uses `-backend=false`).

## Apps

- **API**: Lambda hosts the Express app via `@vendia/serverless-express`; API Gateway invokes Lambda.
- **API secrets**: Lambda resolves Supabase parameter names from SSM at runtime (`SUPABASE_URL_PARAM`, `SUPABASE_SERVICE_ROLE_KEY_PARAM`) with IAM-scoped `ssm:GetParameter`.
- **Web**: `apps/web` builds as static export (`out/`) and is served from S3 + CloudFront.
- **Never** commit `terraform.tfvars` with real secrets.

## Cost controls (Phase 3)

- **Hard caps**:
  - Lambda `reserved_concurrent_executions` via `api_lambda_reserved_concurrency`
  - API Gateway stage throttling via `api_gateway_throttling_rate_limit` and `api_gateway_throttling_burst_limit`
- **Budget alerts**: `aws_budgets_budget` with threshold notifications (50/80/100% by default) to `budget_alert_email_addresses`.
- **Scheduled pause/resume** (optional): EventBridge Scheduler can pause the API by setting Lambda concurrency to `0`, then resume by removing the override.

After apply, upload web assets (build `apps/web/out` **first** with production **`NEXT_PUBLIC_API_URL`** and Supabase **`NEXT_PUBLIC_*`** so the static bundle calls the right API and Auth project — see **[`docs/plans/smoke_test_deployment_guide.plan.md`](../../docs/plans/smoke_test_deployment_guide.plan.md)**):

```bash
aws s3 sync /path/to/repo/apps/web/out s3://<web_bucket_name> --delete
```

## Later (hygiene and hardening)

- **Dependency lockfile**: The dev stack lockfile is **already tracked**; keep it updated when providers change (see **Provider lockfile** above).
- **State and secrets**: Managed SSM parameter values live in Terraform state as well as in AWS. Use an encrypted remote backend and strict IAM on state; do not share or commit state files.
- **SSM toggle**: With `manage_supabase_credentials_in_ssm = false`, Supabase variables are still required today—consider making them optional when the module is disabled if you often run without mirroring to SSM.
- **Remote backend**: Enable the S3 backend in `envs/dev/versions.tf` before team or production workflows (already summarized above).
- **KMS**: If policy requires it, use a customer-managed KMS key for `SecureString` parameters instead of the default SSM encryption.
- **CI extras**: Optional **tflint** or `terraform plan` (with read-only or mock credentials) for stricter checks beyond `fmt` + `validate`.
