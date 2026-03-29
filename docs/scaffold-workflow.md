# Scaffold workflow (recommended)

Use this when you **do not** want to fork the template on GitHub. You create an **empty app repo**, clone it next to the template, then run **one command** from the template copy to fill the clone with the monorepo and branding.

## Prerequisites

- Node.js **>=20.19.0** (see root `package.json` `engines` and `.nvmrc`)
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

## See also

- [`scripts/fork.mjs`](../scripts/fork.mjs) — `fork:init` / `fork:check` (called automatically after the copy).
- `npm run fork:check` — After scaffold, confirms `repository.url` and package names are not still template defaults.
- [Repo feature flags](repo-features.md) — Disable CI jobs or Dependabot in **`config/repo-features.json`** before the first push if you want a quieter start.
- [Smoke test deployment guide](plans/smoke_test_deployment_guide.plan.md) — Deploy after the app repo exists.
