# Upstream harvest (child app → template)

Pull **platform** improvements from a **child app** (any repo scaffolded from this template) into **`lattice-app-template`** so future `npm run scaffold` copies inherit them. The child app's **product domain** stays in that repo — only shared platform work moves upstream.

**Ecosystem docs** (plans, research, per-run harvest files) live in the sibling **`cursor/`** folder (open `lattice-ecosystem.code-workspace` alongside this repo) — not inside the template. See `cursor/plans/lattice-contrib-system.md` locally.

## Terminology

| Term | Meaning |
|------|---------|
| **Template** | `lattice-app-template` — canonical stencil |
| **Child app** | A fork/scaffold where you built product V1 (e.g. `runout` today; more later) |
| **`<child-app>`** | Placeholder for the child folder or `--spawn-name` (e.g. `runout`, `acme-billing`) |

## Prerequisites

- **Node 22** at the template root
- **Child app clone** next to the template (e.g. `../<child-app>`)
- **Multi-root workspace** recommended: `lattice-ecosystem.code-workspace` (template + child app + `cursor/`)

## 1. Generate the index (script)

From **`lattice-app-template`**:

```bash
npm run lattice:harvest-index -- --from ../<child-app>
```

Example (current child app):

```bash
npm run lattice:harvest-index -- --from ../runout
```

Options:

| Flag | Purpose |
|------|---------|
| `--from <path>` | Child app repo (required) |
| `--spawn-name <child-app>` | Output filename segment (default: basename of `--from`) |
| `--out <file.md>` | Override output (default: `../cursor/research/harvests/harvest-<date>-<child-app>.md`) |
| `--dry-run` | Print markdown to stdout |

The script writes **§ SCRIPT —** sections only (inventory). Re-run updates SCRIPT blocks and **preserves** existing **§ AGENT —** and **§ REVIEWER —** content.

### Product exclusions (per child app — not hardcoded)

The script does **not** use a fixed list of product folder names. It builds exclusions from:

1. **Inference** — feature folder/file tokens in the **child app** but not in the **template** (`apps/web/app/`, `apps/api/routes/`, use-cases, entities, …). Example: template has `things/`; a child app has `matches/` → `matches` is excluded for that harvest.
2. **Child app config** (optional) — `lattice-harvest.json` or `.lattice/harvest.json` at the child app repo root.
3. **Template config** (optional) — same file in the template repo for shared defaults.

Example child app override (`lattice-harvest.json` next to `package.json`):

```json
{
  "productPathSegments": ["billing", "legacy-import"],
  "platformPathSegments": ["auth"],
  "disableInference": false
}
```

| Field | Purpose |
|-------|---------|
| `productPathSegments` | Extra path segments to treat as product-only (any path component match) |
| `platformPathSegments` | Segments to **never** exclude (even if only in the child app) |
| `disableInference` | If `true`, use only config lists (no child−template token diff) |

The harvest doc lists inferred + config segments under **§ SCRIPT — Product exclusion rules**.

## 2. Analyze (agent)

In Cursor Agent, attach **Template integrator** (when configured in `cursor/.cursor/rules/`) and prompt:

```text
Read cursor/research/harvests/harvest-<date>-<child-app>.md (SCRIPT sections are done).
Fill § AGENT — Feature proposals and § AGENT — Foundation audit.
Every foundation hunk needs F-###, What/Why, classification, and recommendation.
Leave § REVIEWER — Decisions empty. Do not edit lattice-app-template or the child app.
```

## 3. Decide (you)

Fill **§ REVIEWER — Decisions** — which features and which `F-###` foundation IDs to port.

## 4. Integrate (agent)

```text
Using harvest-<date>-<child-app>.md § REVIEWER — Decisions: integrate approved items on branch
integrate/<child-app>-<date> in lattice-app-template. Generalize for template (Things scaffold stays).
npm run ci until green.
```

Review the diff and merge template `main`. **Existing child apps are not auto-updated** — only future scaffolds inherit the change unless you port back manually.

## Validation

```bash
npm run ci
```

from the template root before merge.

## Related

- Path classification: `scripts/lattice-harvest-paths.mjs`, `scripts/lattice-harvest-product-context.mjs`
- Config example: `.lattice/harvest.json.example`
- Ecosystem research: `../cursor/research/lattice-ecosystem-upstream-harvest.md` (local workspace)
- Scaffold outbound: [Scaffold workflow](../scaffold-workflow.md)
