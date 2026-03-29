# `config/`

## Purpose

- **`repo-features.json`** — Feature flags for **repository automation** (CI job toggles, Dependabot). See [`docs/repo-features.md`](../docs/repo-features.md).
- **`repo-features.schema.json`** — JSON Schema for editors and validation.

## Conventions

- Prefer editing **`repo-features.json`** and running **`npm run repo-features:apply`** (for Dependabot file renames) over hand-editing `.github/dependabot.yml` when disabling updates.
- Use **`custom`** for team-specific metadata your own scripts read; Lattice tooling ignores it.
