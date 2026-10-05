# Upstream harvest (child app → template)

Pull **platform** improvements from a **child app** into **`lattice-app-template`** so future `npm run scaffold` copies inherit them. Product code stays in the child app.

**Growth policy:** [Template growth](template-growth.md) — every approval must name a destination (**kernel** / **capability** / **catalog**). Agents: always-on `template-growth`, path-scoped `harvest-expert`.

**Ecosystem docs** live in sibling **`cursor/`** (open `lattice-ecosystem.code-workspace`). Master plan: `cursor/plans/lattice-contrib-system.md`.

## Terminology

| Term | Meaning |
|------|---------|
| **Template** | `lattice-app-template` |
| **Child app** | Repo scaffolded from the template where you built V1 (e.g. `runout`) |
| **Harvest doc** | `docs/research/harvests/harvest-<date>-<child-app>.md` — one file per run (in this template repo) |

---

## Workflow at a glance

| Step | Who | What you have when done |
|------|-----|-------------------------|
| **1. Index** | You run script | Harvest doc with **§ SCRIPT —** filled (file lists only) |
| **2. Analyze** | Cursor Agent | Same file with **§ AGENT —** filled (what to port + `F-###` foundation notes) |
| **3. Decide** | You | **§ REVIEWER —** table filled (`APPROVE-KERNEL` / `APPROVE-CAPABILITY` / `APPROVE-CATALOG` / `SKIP` / `DEFER`) |
| **4. Integrate** | Cursor Agent | Changes on a **template** branch; `npm run ci` green; you merge |
| **5. (Later)** | Optional | New scaffolds get the update; **child app is not auto-updated** |

```text
  npm run harvest [-- index]        →  § SCRIPT —
  Agent chat                        →  § AGENT —
  You edit the markdown             →  § REVIEWER —
  Agent on template branch          →  git diff in lattice-app-template
  You merge                         →  future scaffolds win
```

---

## Prerequisites

- **Node 22** at the template root (`nvm use` if needed)
- Child app cloned next to template (e.g. `../runout`)
- **Multi-root workspace** recommended: template + child app + `cursor/`

---

## Step 1 — Generate the index (script) ✓ you may be here

From **`lattice-app-template`**:

```bash
npm run harvest -- --from ../fosterfolio --focus profile,styling,components
# same as: npm run harvest -- index --from ../fosterfolio
# alias:   npm run lattice:harvest-index -- --from ../fosterfolio
```

Output (default): **`docs/research/harvests/harvest-<today>-fosterfolio.md`** (under this template, not `cursor/`)

Open that file. You should see:

| Section | Status after step 1 |
|---------|---------------------|
| § SCRIPT — Product exclusion rules | ✅ Filled by script |
| § SCRIPT — Feature candidates | ✅ Filled by script |
| § SCRIPT — Foundation files changed | ✅ Filled by script |
| § SCRIPT — Excluded and template-only | ✅ Filled by script |
| § AGENT — Feature proposals | ⬜ Stub only — **next step** |
| § AGENT — Foundation audit | ⬜ Stub only — **next step** |
| § REVIEWER — Decisions | ⬜ Empty — **you fill after step 2** |

**Quick read (5–10 min):** Skim **Product exclusion rules** (sane?). Skim **Feature candidates** (platform-ish paths, not product folders). Note **Foundation files changed** (small plumbing diffs — agent will explain each).

Re-run the script anytime to refresh **§ SCRIPT —** only; it keeps **§ AGENT —** / **§ REVIEWER —** if already written.

### Script options

| Flag | Purpose |
|------|---------|
| `--from <path>` | Child app repo (required) |
| `--spawn-name <name>` | Filename segment (default: folder basename) |
| `--out <file.md>` | Override output path |
| `--focus <csv>` | **Highlight** utility scopes (`profile`, `styling`, `components`, `docs`). Not an include list — product UI can still match and must stay excluded. |
| `--include-segment <seg>` | Keep a normally excluded product segment in the harvest (repeatable) |
| `--dry-run` | Print to stdout |

### Product exclusions (automatic)

Not a fixed Runout list. The script **infers** product path segments (child app has `matches/`, template has `things/`, etc.) plus optional `lattice-harvest.json` in the child app. See `.lattice/harvest.json.example`.

---

## Step 2 — Analyze (Cursor Agent) ← do this next

1. Open the template repo (and the child app if you want to diff).
2. Open your harvest doc (e.g. `docs/research/harvests/harvest-2026-10-05-fosterfolio.md`).
3. Start a **new Agent** chat.
4. Paste (replace the filename if yours differs):

```text
Read docs/research/harvests/harvest-2026-10-05-fosterfolio.md.

The § SCRIPT — sections are complete. Do not re-scan both repos from scratch — use that file as your checklist.

1. Fill § AGENT — Feature proposals (Track 1):
   - Group § SCRIPT — Feature candidates into platform bundles.
   - Per bundle: destination KERNEL|CAPABILITY|CATALOG|SKIP, files, wiring, Things conflicts, two-app bar (docs/playbooks/template-growth.md).
   - Skip child-app product domain even if --focus highlighted it.

2. Fill § AGENT — Foundation audit (Track 2):
   - For each file in § SCRIPT — Foundation files changed, diff template vs child app.
   - Per logical change assign F-001, F-002, … with: What, Why, UNIVERSAL|PROTOTYPE|UNSURE, APPROVE-KERNEL|APPROVE-CAPABILITY|SKIP|DEFER.

Do not edit lattice-app-template or the child app. Do not fill § REVIEWER — yet.
```

5. When the agent finishes, read **§ AGENT —**. Push back in chat if foundation changes are vague or product code slipped in.

Harvest analysis/integrate attaches **`harvest-expert`** when those files are in context. **`template-growth`** is always on.

---

## Step 3 — Decide (you)

In the same harvest doc, fill **§ REVIEWER — Decisions**:

| Item | Type | Verdict | Notes |
|------|------|---------|-------|
| email-allowlist | feature | APPROVE-CAPABILITY | default off |
| deploy-aws-web | feature | APPROVE-KERNEL | |
| profile-primitives | feature | APPROVE-CATALOG | not copied by scaffold |
| F-002 | foundation | APPROVE-KERNEL | auth localhost helper |
| F-007 | foundation | SKIP | child-app-specific |
| … | | | |

- **Feature rows** — name the bundle from § AGENT — Feature proposals.
- **Foundation rows** — use `F-###` IDs from § AGENT — Foundation audit.
- **Destinations** — `APPROVE-KERNEL` (on), `APPROVE-CAPABILITY` (in tree, off), `APPROVE-CATALOG` (`catalog/`, not default clone). Bare `APPROVE` is incomplete.
- **SKIP** / **DEFER** anything you do not want now.

You do not need every SCRIPT path — only what you explicitly approve here gets integrated. `--focus` matches are not approvals.

---

## Step 4 — Integrate (Cursor Agent)

1. Create/use a branch in **`lattice-app-template`** only (e.g. `integrate/runout-2026-05-18`).
2. New Agent chat (or continue) with:

```text
In lattice-app-template only, on branch integrate/runout-2026-05-18:

Integrate only § REVIEWER — Decisions rows marked APPROVE-KERNEL, APPROVE-CAPABILITY,
or APPROVE-CATALOG in docs/research/harvests/harvest-2026-10-05-fosterfolio.md.

- Kernel → default tree, on. Capability → default tree, off + playbook. Catalog → catalog/<bundle-id>/ only.
- Generalize for the template (keep Things scaffold; strip child-app naming).
- Wire Container, routes, .env.example, terraform, tests as needed (not for catalog).
- Do not modify the child app repo.

Run npm run ci from lattice-app-template and fix until green.
```

3. Review the **git diff in the template repo**.
4. Merge to template `main` when satisfied.

**Child app (`runout`) does not change** unless you manually port fixes back later.

---

## Step 5 — After merge

- **New apps:** `npm run scaffold` copies the updated template.
- **Existing child app:** unchanged unless you cherry-pick or re-harvest later.
- **Long-lived spawns (e.g. smoke-test):** re-sync platform code from your local template checkout — see **[Refresh an existing spawn](../scaffold-workflow.md#refresh-an-existing-spawn-re-sync-from-template)**. Commit **`.lattice/refresh.json`** in the spawn repo (see [`.lattice/refresh.json.example`](../.lattice/refresh.json.example)); run **`npm run scaffold:refresh -- --into ../your-spawn`** from the template.

---

## Validation

```bash
cd lattice-app-template
npm run ci
```

Before merging the integrate branch.

---

## Related

- [Template growth](template-growth.md) — kernel / capability / catalog
- `agents/prompts/template-growth.md`, `agents/prompts/harvest-expert.md`
- `scripts/harvest.mjs` (`npm run harvest`), `lattice-harvest-index.mjs`, `lattice-harvest-paths.mjs`, `lattice-harvest-product-context.mjs`
- `.lattice/harvest.json.example` — optional product-path hints for harvest indexing (child app)
- `.lattice/refresh.json.example` — spawn refresh manifest (committed in **target** repo after scaffold)
- [`docs/research/harvests/`](../research/harvests/) — harvest reports written by `npm run harvest`
- [Scaffold workflow](../scaffold-workflow.md) — greenfield scaffold and [refresh an existing spawn](../scaffold-workflow.md#refresh-an-existing-spawn-re-sync-from-template)
