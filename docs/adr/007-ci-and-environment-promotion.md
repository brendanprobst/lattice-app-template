# ADR-007: CI Validation and Manual Deployment Promotion

## Status

Accepted

## Context

We want this repository to remain a low-friction **template source** while still enforcing quality and secure defaults. There are two competing needs:

- Strong quality gates on every change.
- No accidental cloud deployment from the template repository itself.

We also expect many downstream projects to eventually require multi-environment promotion (`dev/stage/prod`), but enforcing that complexity in the template from day one increases setup overhead for every fork.

## Decision

### CI policy

- Keep **CI pipelines enabled on push/PR** for validation (build, lint, type-check, tests, Terraform fmt/validate).
- CI in this template is **validation-only**; it does not deploy infrastructure or application artifacts by default.

### Deployment policy

- Deployment is **manual by command**, not automatic by push to `main`.
- The template ships **`npm run deploy:aws`** (API Lambda bundle, Terraform apply, static web build with `NEXT_PUBLIC_API_URL` from Terraform output, `aws s3 sync`) — see [`docs/deploy-aws.md`](../deploy-aws.md).
- An optional **GitHub Actions** workflow **Deploy (AWS)** runs only via **workflow_dispatch** (never on every commit); it uses OIDC and the same deploy script.
- Support remains for **per-layer** steps if you do not use the single command.

### Environment promotion policy

- Do **not** enforce `dev/stage/prod` in the template by default.
- Keep Terraform and naming **environment-parameterized out of the box** so forks can add `envs/stage` and `envs/prod` without architectural rewrites.
- Multi-environment rollout is a **post-fork responsibility** to match each project’s risk profile, approvals, and budget model.

## Consequences

### Positive

- Every commit still gets immediate quality feedback.
- Reduced risk of accidental spend or secret misuse from template CI.
- Faster onboarding for new forks, with a clear maturity path to promotion environments.
- Environment-ready naming and variable patterns reduce rework later.

### Negative

- Manual deployment steps require operator discipline until automation is added in forks.
- Different forks may adopt deployment automation at different times, creating process variation.
- A single-command deploy workflow is documented as a target but may require small fork-specific adaptation (credentials, region/account policy, release process).

## Alternatives Considered

- **Auto-deploy on every push from template**: Rejected due to cost/security risk and mismatch with template purpose.
- **Force `dev/stage/prod` from day one**: Rejected due to setup complexity and higher baseline effort for simple projects.
- **Disable CI entirely**: Rejected because quality drift in templates propagates to every fork.

## Implementation notes

- Existing Terraform already parameterizes resource naming by `${project_name}-${environment}` and keeps environment-specific values in `infra/terraform/envs/<env>/terraform.tfvars`.
- Keep infrastructure modules generic and avoid hard-coded environment assumptions.
- Add deployment automation in forks using manual dispatch + protected environments when ready.

## Related documents

- [ADR-006: Full-Stack Layout and AWS Deployment Strategy](./006-full-stack-and-deployment.md)
- [Smoke test deployment guide](../plans/smoke_test_deployment_guide.plan.md)
- [Zero-cost-first E2E plan](../plans/zero-cost-first_e2e_deployment_plan_cd815a81.plan.md)
