# `infra/` — Terraform

## Purpose

**AWS** infrastructure as code under [`terraform/`](terraform/). Supabase remains hosted; **credentials and URL** are defined in **`terraform.tfvars`** (per environment) and optionally **replicated to SSM** for hybrid AWS workloads.

## Conventions

- **Modules** in `terraform/modules/` stay generic; **project-specific** values live in `terraform/envs/<env>/terraform.tfvars`.
- Do not commit real **`terraform.tfvars`**; use **`terraform.tfvars.example`** as the template.
- Commit **`terraform/envs/dev/.terraform.lock.hcl`** when it changes (provider parity for CI and laptops).
- Prefer **remote state** (S3 + DynamoDB lock) before team or production use.
- Keep environment naming and variables portable so new `envs/stage` and `envs/prod` can be added later without changing module behavior (see `docs/adr/007-ci-and-environment-promotion.md`).

## Commands (from repo root)

- `npm run infra:fmt` — `terraform fmt -recursive`
- `npm run infra:validate` — `init -backend=false` + `validate` for `envs/dev`
- `npm run deploy:aws` — Lambda bundle + **`terraform apply`** + static web + **`aws s3 sync`** (see **[`docs/deploy-aws.md`](../docs/deploy-aws.md)**)

CI runs **`terraform fmt -check`** and **`validate`** as the standard low-overhead baseline. For stricter static analysis later, **tflint** is a common add-on (not wired in this template by default).

See [`terraform/README.md`](terraform/README.md) for layout, **first-time apply**, and **[connecting your AWS account](terraform/README.md#connecting-your-aws-account-for-deployment)** (CLI / SSO / optional GitHub OIDC for deployment). Optional **custom domain + Route 53**: [`docs/playbooks/route53-custom-domain.md`](../docs/playbooks/route53-custom-domain.md).
