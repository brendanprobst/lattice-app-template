# `infra/` — Terraform

## Purpose

**AWS** infrastructure as code under [`terraform/`](terraform/). Supabase remains hosted; **credentials and URL** are defined in **`terraform.tfvars`** (per environment) and optionally **replicated to SSM** for hybrid AWS workloads.

## Conventions

- **Modules** in `terraform/modules/` stay generic; **project-specific** values live in `terraform/envs/<env>/terraform.tfvars`.
- Do not commit real **`terraform.tfvars`**; use **`terraform.tfvars.example`** as the template.
- Prefer **remote state** (S3 + DynamoDB lock) before team or production use.
- Keep environment naming and variables portable so new `envs/stage` and `envs/prod` can be added later without changing module behavior (see `docs/adr/007-ci-and-environment-promotion.md`).

## Commands (from repo root)

- `npm run infra:fmt` — `terraform fmt -recursive`
- `npm run infra:validate` — `init -backend=false` + `validate` for `envs/dev`

See [`terraform/README.md`](terraform/README.md) for layout and first-time apply.
