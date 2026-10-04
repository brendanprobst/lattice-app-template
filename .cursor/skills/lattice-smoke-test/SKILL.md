---
name: lattice-smoke-test
description: >-
  Operates the lattice-app-smoke-test canary standup (Infisical
  /lattice-smoke-test, dual-env Terraform, refresh, GitHub Deploy app)
  and answers “what is next.” Use when the user invokes /lattice-smoke-test,
  asks the next smoke-test deploy step, or is wiring Infisical/GitHub/AWS
  for lattice-app-smoke-test.
disable-model-invocation: true
---

# Lattice smoke-test

Work in **`lattice-app-smoke-test`**, not the template (the template is never deployed). Be conversational. Do not print secret values.

Read spawn names from `docs/playbooks/lattice-smoke-test-deploys.md` and `.lattice/infisical.json`. Generic procedure lives in `docs/playbooks/infisical-github-deploys.md`.

## Facts

| Thing | Value |
| --- | --- |
| Infisical project | `lattice` (Fosterfolio is `/fosterfolio/**` in the same project) |
| App slug | `lattice-smoke-test` |
| Folders | `/lattice-smoke-test/{shared,flags,sensitive}` only — never `/shared` or `/` |
| Laptop CLI project id | from Fosterfolio `.infisical.json` `workspaceId`, or `infisical init` in smoke-test (gitignored) |
| GitHub | `brendanprobst/lattice-app-smoke-test` |
| GitHub (repo Actions secrets, once) | `INFISICAL_PROJECT_SLUG`, `INFISICAL_APP_SLUG=lattice-smoke-test`, identity, `AWS_ROLE_ARN` |
| Live AWS stack | `envs/dev`, names `lattice-app-smoke-test-dev-*`, domain `lattice.brendanprobst.com` |
| Planned dev host | `dev.lattice.brendanprobst.com` (retarget existing `envs/dev`; apex downtime OK) |
| Planned prod host | `lattice.brendanprobst.com` (new `envs/prod` state — do not rename `environment` on live state) |
| DNS | not Route 53 (`manage_web_dns_in_route53 = false`) |

Refresh overwrites `AGENTS.md` and generic playbooks. Spawn names stay in `.lattice/infisical.json` and `preservePaths` (today: `docs/playbooks/lattice-smoke-test-deploys.md`). After refresh, run `.lattice/refresh.json` `postRefreshPrompts`.

## What’s next

Check in this order. First failing item is the move. Say it in one sentence, then the command or GitHub click.

1. **Infisical `dev` folders** — keys must be under `/lattice-smoke-test/shared` and `/lattice-smoke-test/flags`, not `/shared`.

```bash
infisical secrets --env=dev --path=/lattice-smoke-test/shared --projectId=<lattice-project-id>
infisical secrets --env=dev --path=/lattice-smoke-test/flags --projectId=<lattice-project-id>
```

`shared` needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `flags` needs `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDER`. Do not put `NEXT_PUBLIC_API_URL` or Terraform outputs here by hand.

2. **GitHub:** create environments `dev` and `prod` (prod: required reviewer — that is all they hold). Put `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `AWS_ROLE_ARN`, `INFISICAL_PROJECT_SLUG`, and `INFISICAL_APP_SLUG=lattice-smoke-test` **once** under repo Actions secrets. New Infisical identity `github-lattice-smoke-test` (this app’s folders only). New AWS role `lattice-smoke-test-gha`. Terraform for per-spawn roles is **F2c**.

3. **Retarget `envs/dev`** — set `web_custom_domain` to `dev.lattice.brendanprobst.com`, `terraform apply`, then registrar ACM + CNAME. Then:

```bash
npm run infisical:sync-outputs -- --env dev
```

4. **Deploy app** → `dev` (any branch). Confirm the log’s Supabase host and API host.

5. **Prod** only after a *different* Supabase project is in `/lattice-smoke-test/shared` for Infisical `prod`. Fill `envs/prod/terraform.tfvars` + `apps/web/.env.prod`, apply, sync `--env prod`, Deploy app from `main`.

Do not copy the current (same) Supabase project into Infisical `prod`. Leave `/lattice-smoke-test/sensitive` for laptop-only keys (`SUPABASE_DB_URL`). `infisical run` without `--path=/lattice-smoke-test/shared` is useless.

## After refresh

Follow `postRefreshPrompts` in `.lattice/refresh.json`: docs only, git history for overwritten files, append real spawn edits to a `preservePaths` doc, rename leftover “Lattice” / `lattice-app-template` branding to **lattice-app-smoke-test**.
