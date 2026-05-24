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

### 5. Install, verify, and commit from the app repo

```bash
cd ../my-app
npm ci
npm run ci
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
| `prunePaths` | no | Paths **relative to repo root** to delete after copy (orphans removed in template, e.g. legacy `/login` after `/auth/*` migration) |
| `notes` | no | Operator reminders only; tooling ignores |

Example (smoke-test canary):

```json
{
  "name": "lattice-app-smoke-test",
  "repo": "https://github.com/your-org/lattice-app-smoke-test.git",
  "prunePaths": [
    "apps/web/app/login",
    "apps/web/client/pages/login"
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
3. Run existing **`scaffold.mjs`** with `--into`, `--name`, `--repo` from the manifest, plus **`--force --yes`** (non-interactive merge into a non-empty tree).
4. Delete each path in `prunePaths` under the target if it exists.
5. Print a **post-refresh checklist** (below); do **not** run `npm ci`, deploy, or Supabase.

Optional flags (planned): `--dry-run` (scaffold dry-run + list prunes), `--skip-prune`.

### What refresh preserves vs overwrites

**`scaffold.mjs` copy-over** (same as manual `scaffold --force --yes`):

| Typically preserved in target | Why |
|-------------------------------|-----|
| `.git/` | Never copied from template |
| `infra/terraform/envs/dev/terraform.tfvars` | Real tfvars excluded from template source; target file kept |
| `infra/terraform/envs/dev/.terraform/` | Local state; not in template tree |
| `apps/api/.env` | Target-only secrets |
| `apps/web/.env.production.local`, `.env.local`, etc. | Target-only (deploy scripts load these) |
| GitHub Actions secrets | Not in repo |

| Overwritten when path exists in template | Examples |
|------------------------------------------|----------|
| Tracked source, scripts, tests, workflows | `apps/`, `infra/` (except tfvars), `test/`, `.github/` |
| Root `package.json`, lockfile, `.nvmrc`, `.npmrc` | Run **`npm ci`** in target after refresh |

| Removed only via `prunePaths` | Example |
|-------------------------------|---------|
| Legacy paths dropped by template | Old `apps/web/app/login/` after `/auth/sign-in` migration |

Refresh is **not** a git merge from template remote — it copies from your **local** template working tree. Check out the template branch/commit you trust before running refresh.

### Post-refresh checklist (spawn repo)

From the **target** folder after refresh:

```bash
cd ../lattice-app-smoke-test   # or your spawn path
npm ci
npm run ci
```

Then, only if something below changed since your last deploy:

| Step | When needed |
|------|-------------|
| **Supabase → Auth → URL configuration** | Auth routes changed (e.g. `/login` → `/auth/sign-in`, forgot/reset password). Add redirect URLs for new paths. |
| **Supabase SQL** | New files under `apps/api/supabase/migrations/` — apply per [Supabase migrations playbook](playbooks/supabase-migrations.md) |
| **Terraform** | Merge new keys from `terraform.tfvars.example` into existing `terraform.tfvars`; `npm run deploy:aws -- --auto-approve` or `npm run deploy:aws:web` if only static web changed |
| **Browser smoke** | Sign-in, profile, Things against deployed URLs ([smoke test deployment guide](plans/smoke_test_deployment_guide.plan.md)) |

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
