# Repo feature flags (`config/repo-features.json`)

This file is the **baseline** for how optional **repository automation** is used: CI jobs in `.github/workflows/ci.yml`, **Dependabot**, and a free-form **`custom`** object for your own scripts or conventions.

It does **not** replace product feature flags in the API or web app (use env + your own toggles there). The `custom` key is intentionally opaque so you can record or script things like team-specific tooling without Lattice prescribing a schema.

## CI (GitHub Actions)

The **`ci`** object gates jobs on every push and pull request to `main`:

| Key | Default | Effect |
|-----|---------|--------|
| `enabled` | `true` | Master switch. If `false`, the `test`, `web-e2e`, and `terraform` jobs are skipped. |
| `test` | `true` | Node matrix, `npm run ci` (build, lint, type-check, Jest + Vitest unit). |
| `webE2e` | `true` | Playwright Chromium E2E. |
| `terraform` | `true` | `terraform fmt -check` and `terraform validate` for `infra/terraform/envs/dev`. |

If **`config/repo-features.json` is missing**, CI behaves as if all flags are `true`.

**Branch protection:** If you disable jobs that were previously required checks, update the repository’s **Rules** / branch protection so merges are not blocked waiting for skipped jobs.

## Dependabot

GitHub only reads **`.github/dependabot.yml`**. To turn Dependabot **off** while keeping the config in git:

1. Set **`dependabot.enabled`** to **`false`** in `config/repo-features.json`.
2. Run **`npm run repo-features:apply`** — this renames `.github/dependabot.yml` → `.github/dependabot.yml.disabled`.

To turn it back on: set **`true`**, run **`npm run repo-features:apply`** again (renames back).

Commit the resulting filename change. Optional: run with **`--dry-run`** to preview.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run repo-features:apply` | Sync Dependabot on-disk files with `dependabot.enabled`. |
| `npm run repo-features:apply -- --dry-run` | No file moves; prints what would happen. |
| `npm run repo-features:apply -- --print-only` | Print resolved flags; no writes. |

## Disable almost everything from day one

For a minimal repo (no CI, no Dependabot PRs) until you opt in:

```json
{
  "ci": { "enabled": false },
  "dependabot": { "enabled": false }
}
```

Commit, run **`npm run repo-features:apply`**, and commit the Dependabot rename. Re-enable flags later and apply again.

## Schema

[`config/repo-features.schema.json`](../config/repo-features.schema.json) documents the supported keys. Additional top-level properties are allowed for forward compatibility; Lattice scripts only read **`ci`** and **`dependabot`** today.

Use **`custom`** for your own keys (e.g. internal tooling or a future app-level flag convention) without conflicting with Lattice updates.
