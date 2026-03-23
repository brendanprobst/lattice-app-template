# Terraform (Lattice)

Modular layout for **AWS** plus optional **Supabase credentials in config**: you define Supabase values in `terraform.tfvars`, and Terraform can mirror them into **SSM Parameter Store** for Lambdas, ECS, or CI to read with IAM.

## Layout

- `modules/supabase_ssm` — Writes Supabase URL/keys from tfvars into SSM (SecureString where appropriate).
- `envs/dev` — Example root: `locals` for tags + `name_prefix`; add more modules or `envs/prod` as needed.

Extract shared **tag** or **naming** logic into new modules under `modules/` when you add a second environment or stack.

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

Use a **remote S3 backend** for anything shared or production; see commented block in `versions.tf`.

## CI

Root `npm run infra:fmt` and `npm run infra:validate` (no AWS credentials required; validate uses `-backend=false`).

## Apps

- **API**: Lambda hosts the Express app via `@vendia/serverless-express`; API Gateway invokes Lambda.
- **API secrets**: Lambda resolves Supabase parameter names from SSM at runtime (`SUPABASE_URL_PARAM`, `SUPABASE_SERVICE_ROLE_KEY_PARAM`) with IAM-scoped `ssm:GetParameter`.
- **Web**: `apps/web` builds as static export (`out/`) and is served from S3 + CloudFront.
- **Never** commit `terraform.tfvars` with real secrets.

After apply, upload web assets:

```bash
aws s3 sync /path/to/repo/apps/web/out s3://<web_bucket_name> --delete
```

## Later (hygiene and hardening)

- **Dependency lockfile**: After `terraform init` in `envs/dev`, commit the generated `infra/terraform/envs/dev/.terraform.lock.hcl` so CI and every machine use the same provider versions (root `.gitignore` keeps the lockfile tracked, not ignored).
- **State and secrets**: Managed SSM parameter values live in Terraform state as well as in AWS. Use an encrypted remote backend and strict IAM on state; do not share or commit state files.
- **SSM toggle**: With `manage_supabase_credentials_in_ssm = false`, Supabase variables are still required today—consider making them optional when the module is disabled if you often run without mirroring to SSM.
- **Remote backend**: Enable the S3 backend in `envs/dev/versions.tf` before team or production workflows (already summarized above).
- **KMS**: If policy requires it, use a customer-managed KMS key for `SecureString` parameters instead of the default SSM encryption.
- **CI extras**: Optional **tflint** or `terraform plan` (with read-only or mock credentials) for stricter checks beyond `fmt` + `validate`.
