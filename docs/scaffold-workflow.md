# Scaffold workflow (recommended)

Use this when you **do not** want to fork the template on GitHub. You create an **empty app repo**, clone it next to the template, then run **one command** from the template copy to fill the clone with the monorepo and branding.

## Prerequisites

- Node.js **22** (see root `package.json` `engines`, `.nvmrc`, and `.npmrc` `engine-strict`)
- **Git** on your PATH (for `git init` only when the target has no `.git`; cloned repos keep their existing `.git`)
- A **local clone** of this template (for example `lattice-app-template` under your GitHub/projects folder)

## Ideal workflow

### 1. Create the app repository on GitHub

Create a **new** repository (no need to fork the template). It can be empty or GitHub’s default with only a `README.md`.

### 2. Clone it next to the template

Put the template clone and your app clone under the **same parent folder** so paths are simple:

```text
~/GitHub/
  lattice-app-template/    ← this template (clone)
  my-app/                  ← your new repo (clone)
```

Example:

```bash
cd ~/GitHub
git clone https://github.com/your-org/my-app.git
git clone https://github.com/you/lattice-app-template.git   # if you do not already have it
```

### 3. Run the scaffold from the template repo

From **`lattice-app-template`** (the template root, where `package.json` lives):

```bash
cd ~/GitHub/lattice-app-template
npm ci
npm run scaffold -- --into ../my-app --name my-app --repo https://github.com/your-org/my-app.git
```

- **`--into`** — Relative path to the folder you cloned (from your current directory). Use your real folder name.
- **`--name`** — npm package name for the monorepo root (kebab-case, usually matches the repo name).
- **`--repo`** — Same Git URL you used for `git clone` (HTTPS or SSH). This is what `fork:init` writes into `package.json` → `repository.url`.

Optional flags (same as `fork:init`):

- `--scope myorg` — Renames `@lattice/api` / `@lattice/web` to `@myorg/api` and `@myorg/web`.
- `--display-name "My App"` — Human-readable title for branding strings.
- `--reset-readme` — Replace the root `README.md` with a short app scaffold.

### 4. Confirmation prompt

The script **lists what is already in the target folder** (excluding `.git`) and asks whether to proceed.

- **Empty or typical GitHub-only files** (e.g. `README.md`, `LICENSE`, `.gitignore`) → **Proceed? [Y/n]** (default yes).
- **Anything else** (extra folders, `package.json`, etc.) → **Proceed? [y/N]** (default no). Use `--force` to acknowledge merging into a non-empty tree (still prompts; you must confirm).

Non-interactive (CI or scripts, or when **stdin is not a terminal**):

```bash
npm run scaffold -- --into ../my-app --name my-app --repo https://github.com/your-org/my-app.git --yes
```

Without `--yes`, the script requires an interactive terminal so it can prompt; otherwise it exits with an error.

### 5. Env files and commit from the app repo

Scaffold already ran post-scaffold prompts and `npm ci` / `npm run ci` unless you passed `--skip-prompts` / `--skip-tests`.

```bash
cd ../my-app
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp infra/terraform/envs/dev/terraform.tfvars.example infra/terraform/envs/dev/terraform.tfvars
# Follow the guide in `docs/plans/smoke_test_deployment_guide.plan.md` to deploy and smoke test the app.
```

Then commit and push:

```bash
git status
git add -A
git commit -m "Lattice scaffold"
git push -u origin main
```

If you cloned in step 2, **`origin`** is usually already set. If not:

```bash
git remote add origin https://github.com/your-org/my-app.git
git push -u origin main
```

## Dry run

```bash
npm run scaffold -- --into ../my-app --name my-app --repo https://github.com/your-org/my-app.git --dry-run
```

## Alternative: new sibling folder without a prior clone

If you want a **new folder** next to the template (no GitHub clone yet), use **`--folder`** instead of **`--into`**:

```bash
npm run scaffold -- --folder my-app --name my-app --repo https://github.com/your-org/my-app.git
```

This creates `../my-app` if needed, then merges the template. You still run **`git init`** locally when there was no `.git`, then add `origin` and push after creating the empty repo on GitHub.

## Refresh an existing spawn (re-sync from template)

Use this when a repo was **already scaffolded** (e.g. **`lattice-app-smoke-test`** deploy canary, or any long-lived fork) and you want **platform code** from a newer template checkout **without** re-entering secrets, Terraform state, or deploy env files.

This is **not** the path for a brand-new product app — use [Ideal workflow](#ideal-workflow) above. Harvest updates the **template** only; existing spawns stay stale until you refresh (see [Upstream harvest — Step 5](playbooks/upstream-harvest.md#step-5--after-merge)).

### Mental model

| Operation | Target | Config lives in |
|-----------|--------|-----------------|
| **Scaffold** (greenfield) | Empty or README-only clone | CLI flags (`--into`, `--name`, `--repo`) |
| **Refresh** (re-sync) | Full existing repo | **Target repo** `.lattice/refresh.json` |

Refresh = run **`scaffold`** with saved flags from the target’s manifest, then **prune** obsolete paths that copy-over would leave behind.

### `.lattice/refresh.json` (in the spawn repo)

Each spawn that you intend to re-sync should commit a manifest at **`.lattice/refresh.json`** (see [`.lattice/refresh.json.example`](../.lattice/refresh.json.example)). The template does **not** keep a list of known spawns — the **target repo owns its refresh identity**.

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | yes | npm package name passed to `fork:init` (usually matches repo name) |
| `repo` | yes | Git remote URL for `package.json` → `repository.url` |
| `preservePaths` | no | Extra spawn-owned paths to restore after copy (on top of the defaults below) |
| `prunePaths` | no | Paths **relative to repo root** to delete after copy. Preserved paths are never pruned. |
| `notes` | no | Short operator reminder printed at the start of refresh |
| `postRefreshPrompts` | no | Array of prompts the pipeline runs via `agent` / `cursor agent` after copy + restore (docs repair, branding). `--skip-prompts` skips. |

Example (smoke-test canary):

```json
{
  "name": "lattice-app-smoke-test",
  "repo": "https://github.com/your-org/lattice-app-smoke-test.git",
  "preservePaths": [
    "docs/playbooks/lattice-smoke-test-deploys.md"
  ],
  "prunePaths": [
    "apps/web/app/login",
    "apps/web/client/pages/login"
  ],
  "postRefreshPrompts": [
    "After refresh, look only at overwritten documentation (AGENTS.md, README, generic playbooks).",
    "Overwrites are expected. Substantial spawn-only edits go into a preservePaths doc, not back into the template file.",
    "Rename leftover Lattice / lattice-app-template branding to this spawn's name."
  ]
}
```

Add or adjust `prunePaths` when a template refactor **removes** routes or folders your spawn still has from an older scaffold. Refresh does **not** delete arbitrary drift — only listed paths.

**First-time setup:** after greenfield scaffold, copy `.lattice/refresh.json.example` → `.lattice/refresh.json`, fill `name` / `repo`, commit in the spawn repo.

### Refresh command (from template checkout)

**`scripts/refresh-spawn.mjs`** + **`npm run scaffold:refresh`**.

```bash
cd ~/GitHub/lattice-app-template          # template at the commit you want to sync
npm run scaffold:refresh -- --into ../lattice-app-smoke-test
```

Behavior (spec):

1. Resolve `--into` to an existing directory (required).
2. Read **`<target>/.lattice/refresh.json`**; fail with a clear message if missing.
3. Snapshot spawn-owned paths (defaults + `preservePaths`).
4. Run **`scaffold.mjs`** with `--into`, `--name`, `--repo` from the manifest, plus **`--force --yes`**.
5. Delete each path in `prunePaths` (never a preserved path).
6. Restore the snapshot so spawn config wins over anything the copy wrote.
7. Run `postRefreshPrompts` in the spawn via `agent` / `cursor agent` (docs only, as written).
8. Run **`npm ci`** then **`npm run ci`** in the spawn (build, lint, type-check, Jest, Vitest).
9. Print leftover human steps (Supabase, Terraform, Infisical). Do **not** deploy.

Optional flags: `--dry-run` (scaffold dry-run + list prunes + print prompts/tests), `--skip-prune`, `--skip-prompts`, `--skip-tests`.

### What refresh preserves vs overwrites

Refresh **must** keep spawn-owned config. It snapshots these paths before copy and writes them back after:

**Always preserved** (if they exist): `.lattice/refresh.json`, `.lattice/infisical.json`, `.lattice/standup.json`, `.infisical.json`.

**Also preserved** if listed in `preservePaths`: any other spawn-owned file (hostnames, filled playbooks, product notes). Fosterfolio would list `docs/playbooks/infisical-github-deploys.md` here if it keeps names in that file — it will then stop receiving template edits to that path.

**Not copied from the template** (already excluded by `scaffold.mjs`): `.git/`, real `*.tfvars`, `terraform.tfstate`, `.terraform/`, `.env` / `.env.*` except `*.env.example`.

| Overwritten when the path exists in the template | Examples |
|--------------------------------------------------|----------|
| Platform source, scripts, tests, workflows | `apps/`, `infra/` (except tfvars), `test/`, `.github/` |
| Generic playbooks | `docs/playbooks/infisical-github-deploys.md` unless listed in `preservePaths` |
| Root `package.json`, lockfile, `.nvmrc`, `.npmrc` | Run **`npm ci`** in the target after refresh |

| Removed only via `prunePaths` | Example |
|-------------------------------|---------|
| Legacy paths dropped by the template | Old `apps/web/app/login/` after `/auth/sign-in` migration |

Refresh is **not** a git merge from template remote — it copies from your **local** template working tree. Check out the template branch/commit you trust before running refresh.

### Post-refresh checklist (spawn repo)

Refresh already ran `postRefreshPrompts` and `npm ci` / `npm run ci` unless you passed `--skip-prompts` / `--skip-tests`. Then, only if something below changed since your last deploy:

| Step | When needed |
|------|-------------|
| **Supabase → Auth → URL configuration** | Auth routes changed (e.g. `/login` → `/auth/sign-in`, forgot/reset password). Add redirect URLs for new paths. |
| **Supabase SQL** | New files under `apps/api/supabase/migrations/` — apply per [Supabase migrations playbook](playbooks/supabase-migrations.md) |
| **Terraform** | Merge new keys from each env’s `terraform.tfvars.example` into that env’s `terraform.tfvars`. Default is dual-env: fill **dev and prod** on day 1; apply **dev** first. |
| **Infisical / Deploy app** | `.lattice/infisical.json` is restored automatically. List any filled-in playbook in `preservePaths`. Generic steps: [Infisical and GitHub deploys](playbooks/infisical-github-deploys.md). |
| **Browser smoke** | Sign-in, profile, Things against the **dev** URL ([smoke test deployment guide](plans/smoke_test_deployment_guide.plan.md)). Prod is the same check after the first `--env prod` apply. |

Commit in the spawn: `chore: refresh from lattice-app-template @ <short-sha>`.

### When **not** to refresh

- **New product app** — greenfield [scaffold](#3-run-the-scaffold-from-the-template-repo) from current template `main`.
- **Active product child app** (e.g. runout) — usually **cherry-pick** or ignore; refresh would overwrite product code unless paths are isolated.
- **Template not merged yet** — refresh copies whatever is on disk; merge harvest branches to template `main` first if that is your source of truth.

## See also

- [`scripts/fork.mjs`](../scripts/fork.mjs) — `fork:init` / `fork:check` (called automatically after the copy).
- `npm run fork:check` — After scaffold, confirms `repository.url` and package names are not still template defaults.
- [Repo feature flags](repo-features.md) — Disable CI jobs or Dependabot in **`config/repo-features.json`** before the first push if you want a quieter start.
- [Upstream harvest](playbooks/upstream-harvest.md) — Pull platform work from a child app into the template; refresh spawns after merge.
- [Smoke test deployment guide](plans/smoke_test_deployment_guide.plan.md) — Deploy after the app repo exists.
