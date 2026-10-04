# Bootstrap — GitHub OIDC deploy role

Separate Terraform state from `envs/dev` and `envs/prod`. This stack looks up the existing account provider `token.actions.githubusercontent.com` and creates **one** IAM role per spawn: `<app-slug>-gha`.

Trust is **this repo only**: `repo:<github_owner>/<github_repo>:*`. Inputs that look like a GitHub URL (`https://…`) are rejected.

Permissions are **this app only**:

- S3 list + object R/W on `<project_name>-dev-web` and `<project_name>-prod-web`
- CloudFront invalidate / get on this account’s distributions
- Lambda `UpdateFunctionCode`, `GetFunction`, `GetFunctionConfiguration` on `<project_name>-dev-api` and `<project_name>-prod-api`

The role cannot apply Terraform. `npm run standup` applies this stack and sets the repository secret `AWS_ROLE_ARN` when it is missing. You can still `terraform output -raw aws_role_arn` yourself.

Do **not** run `npm run deploy:aws -- --env bootstrap` — this directory is not under `envs/`. Do **not** point `role_name` at `fosterfolio-gha-arn` or widen trust to another repo.

## First apply (new spawn)

```bash
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars
# set app_slug, github_owner, github_repo, project_name, aws_account_id
# leave role_name unset so the role is <app_slug>-gha

terraform init
terraform plan
terraform apply
terraform output -raw aws_role_arn
```

Confirm `terraform output -raw oidc_sub` is `repo:<owner>/<repo>:*`.

## Import `lattice-smoke-test-gha-arn` (do not create a second role)

Smoke-test already has a console-created role named **`lattice-smoke-test-gha-arn`**. Import it. Creating `<app-slug>-gha` (`lattice-smoke-test-gha`) would be a duplicate.

From **`lattice-app-smoke-test`** (after refresh), with credentials for the smoke-test account — not a Fosterfolio-only role session:

```bash
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars
```

Set:

```hcl
app_slug       = "lattice-smoke-test"
github_owner   = "brendanprobst"
github_repo    = "lattice-app-smoke-test"
project_name   = "lattice-app-smoke-test"
aws_account_id = "YOUR_12_DIGIT_ACCOUNT"
aws_region     = "us-east-1"
role_name      = "lattice-smoke-test-gha-arn"
```

Then:

```bash
terraform init
terraform import 'module.gha_deploy_role.aws_iam_role.this' lattice-smoke-test-gha-arn

# Optional: import the existing inline policy if you already named it gha-deploy.
# Otherwise the first apply adds aws_iam_role_policy.deploy (additive).
# terraform import 'module.gha_deploy_role.aws_iam_role_policy.deploy' \
#   lattice-smoke-test-gha-arn:gha-deploy

terraform plan
# Expect trust sub repo:brendanprobst/lattice-app-smoke-test:* and
# lambda:GetFunctionConfiguration on lattice-app-smoke-test-dev-api / -prod-api.
# Do not apply if the plan creates a new aws_iam_role.

terraform apply
```

After apply, detach leftover console policies only when the Terraform `gha-deploy` policy covers Deploy app (S3, CloudFront, Lambda including `GetFunctionConfiguration`).

```bash
aws iam get-role --role-name lattice-smoke-test-gha-arn \
  --query 'Role.AssumeRolePolicyDocument'
```
