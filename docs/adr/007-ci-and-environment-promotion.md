# ADR-007: CI Validation and Manual Deployment Promotion

## Status

Accepted

## Context

We want this repository to remain a low-friction **template source** while still enforcing quality and secure defaults. There are two competing needs:

- Strong quality gates on every change.
- No accidental cloud deployment from the template repository itself.

Downstream apps need a **dev** stack they can break and a **prod** stack they can ship. Standing up only `dev` and treating prod as a later architecture project is how first prod deploys become a full day of work.

## Decision

### CI policy

- Keep **CI pipelines enabled on push/PR** for validation (build, lint, type-check, tests, Terraform fmt/validate).
- CI in this template is **validation-only**; it does not deploy infrastructure or application artifacts by default.

### Deployment policy

- Deployment is **manual by command**, not automatic by push to `main`.
- The template ships **`npm run deploy:aws`** (API Lambda bundle, Terraform apply, static web build with `NEXT_PUBLIC_API_URL` from Terraform output, `aws s3 sync`) — see [`docs/deploy-aws.md`](../deploy-aws.md).
- **Deploy app** (`.github/workflows/deploy-app.yml`) is the GitHub path. It is `workflow_dispatch` only, chooses `dev` or `prod`, and does not run Terraform. Any branch may deploy `dev`; `prod` runs from `main` only. Setup is [`docs/playbooks/infisical-github-deploys.md`](../playbooks/infisical-github-deploys.md).
- Terraform apply stays on a laptop (`npm run deploy:aws`). GitHub does not receive `TERRAFORM_TFVARS`.
- The older **Deploy (AWS)** workflow remains in-repo and is unused.
- Support remains for **per-layer** steps if you do not use the single command.

### Environment promotion policy

- Ship **`dev` and `prod`** in the template (`infra/terraform/envs/dev` and `envs/prod`). Day 1 fills both `terraform.tfvars`, both Infisical folder trees, both web env files, and GitHub environments `dev` / `prod` (prod reviewer only). Identity, role, and slugs are **repository** Actions secrets, not copied onto each environment. Apply and smoke **dev**. The first prod apply and **Deploy app** dispatch should be the same commands with prod values and a reviewer click.
- Keep Terraform and naming **environment-parameterized** (`${project_name}-${environment}`) so a later `envs/stage` is a copy, not a rewrite.
- Do **not** “promote” by changing `environment` on an existing state. That recreates AWS resources. Prod is always a separate state directory.
- A third environment is optional. Two is the default.

## Consequences

### Positive

- Every commit still gets immediate quality feedback.
- Reduced risk of accidental spend or secret misuse from template CI.
- Faster onboarding: fill both environments on day 1; first prod ship is a formality, not a second architecture project.
- Environment-parameterized naming still allows a later `stage` without rewriting modules.

### Negative

- Manual deployment steps require operator discipline until automation is added in forks.
- Different forks may adopt deployment automation at different times, creating process variation.
- A single-command deploy workflow is documented as a target but may require small fork-specific adaptation (credentials, region/account policy, release process).

## Alternatives Considered

- **Auto-deploy on every push from template**: Rejected due to cost/security risk and mismatch with template purpose.
- **Dev-only until you “need” prod**: Rejected. The missing folders, GitHub environment, `tfvars`, and `.env.prod` are what make the first prod ship daunting. Two environments on day 1; apply prod when you choose.
- **Force `dev/stage/prod` from day one**: Rejected. A third env is optional. Two is the default.
- **Disable CI entirely**: Rejected because quality drift in templates propagates to every fork.

## Implementation notes

- Existing Terraform already parameterizes resource naming by `${project_name}-${environment}` and keeps environment-specific values in `infra/terraform/envs/<env>/terraform.tfvars`.
- The template ships `infra/terraform/envs/prod` as a copy of `envs/dev`. CI still validates only `envs/dev`. Fill both `tfvars` on day 1; apply prod when the values exist.
- One Infisical project (`lattice`) holds every Lattice app. Apps are folders `/<app-slug>/{shared,flags,sensitive}`. Laptop sync reads `.lattice/infisical.json` `appSlug`. GitHub **Deploy app** reads `INFISICAL_PROJECT_SLUG` and `INFISICAL_APP_SLUG`.
- Keep infrastructure modules generic and avoid hard-coded environment assumptions.
- Add deployment automation in forks using manual dispatch + protected environments when ready.

## Related documents

- [ADR-006: Full-Stack Layout and AWS Deployment Strategy](./006-full-stack-and-deployment.md)
- [Smoke test deployment guide](../plans/smoke_test_deployment_guide.plan.md)
- [Zero-cost-first E2E plan](../plans/zero-cost-first_e2e_deployment_plan_cd815a81.plan.md)
