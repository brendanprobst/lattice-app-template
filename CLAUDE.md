# Claude agent mode

> Full project context: see `AGENTS.md` (monorepo layout, CI, conventions).

## Template growth (always on — highest priority)

# Template growth (always on — highest priority)

This repo is a **clone-and-go stencil**, not an attic of utilities. Prefer a thin working app over a kitchen-sink skeleton people must strip.

When this conflicts with “it looks generic, put it in the template,” **this document wins**.

## Three destinations (every harvest / template add)

| Destination | Day-one effect | When to use |
|-------------|----------------|-------------|
| **Kernel** | Always copied, always on | Every spawn needs it to be a real app |
| **Capability** | Copied, **default off** | Wiring later is worse than a small dormant module |
| **Catalog** | Harvested, **not** copied by `scaffold` | Useful later; unused on day one |

Do not invent a fourth “drop it in `apps/` because it is reusable.”

### Kernel

Auth, Things demo, `Result` / `ErrorCatalog`, `Container`, tests, standup/deploy, CI. Foundation `F-###` rows that fix universal plumbing.

**Bar:** if you would delete it in a new app on day one, it is not kernel. 
(There is 1 exception: the *thing entity* which is a useful pattern to replicate then delete.)

### Capability

In-tree, env/SQL/flag off. Examples: email allowlist, PostHog. Cap this set (a handful). Each needs a playbook, an off-switch, and tests that pass with the flag off.

### Catalog

Profile product surfaces, extra shadcn, QR share, markdown widgets, one-off HOCs. Land under `catalog/<bundle-id>/` only when a reviewer marks **APPROVE-CATALOG**. Do **not** create `catalog/` until the first such approval. `npm run scaffold` must not copy catalog unless the operator opts in.

## Harvest is intake, not a merge

`npm run harvest` indexes. `--focus` only **highlights** paths. Product nouns (`pet`, `inquiry`, child-app profile pages) stay in the child app.

`--focus profile,styling,components` is **not** permission to bake those files into kernel.

### Reviewer verdicts (required)

| Verdict | Meaning |
|---------|---------|
| `APPROVE-KERNEL` | Bake into the default tree, on |
| `APPROVE-CAPABILITY` | Bake into the default tree, off |
| `APPROVE-CATALOG` | Record / copy into `catalog/`, not the default clone |
| `SKIP` | Do not take |
| `DEFER` | Not now |

Bare `APPROVE` is incomplete. Treat it as “ask the reviewer to pick a destination,” not as kernel.

### Two-app bar

A UI or helper is kernel or capability only if **two child apps** needed the same **generalized** form, or Things/auth will use it immediately. One Fosterfolio `ProfilePage` / `PetCard` is catalog or skip.

## Do not

- Bulk-copy `client/components` or a child-app feature folder into the template
- Comment out unused feature trees “for later”
- Add packages or packages-per-widget for a solo maintainer
- Auto-update child apps; refresh is explicit (`scaffold:refresh` + `preservePaths`)
- Grow capabilities without a playbook and a default-off flag

## Pointers

- Playbook: `docs/playbooks/upstream-harvest.md`
- Policy narrative: `docs/playbooks/template-growth.md`
- Harvest expert (path-scoped): `agents/prompts/harvest-expert.md`


## Expert context (auto-loaded by directory)

Claude Code reads the `CLAUDE.md` closest to the file you're editing, loading expert
guidance automatically as you navigate the project:

| Directory | Expert loaded |
|-----------|---------------|
| `apps/api/domain/`, `apps/api/application/`, `docs/adr/` | DDD expert |
| `apps/api/`, `apps/web/client/`, `apps/web/app/`, `test/api/`, `test/web/` | Test expert (tests-first) |
| `apps/api/infrastructure/`, `apps/api/config/`, `apps/web/client/lib/` | Infrastructure expert |
| `docs/research/harvests/` | Harvest expert |

Single-file globs load from `.claude/rules/` when Claude reads a matching file:

| Files | Expert loaded |
|-------|---------------|
| `test/AGENTS.md` | Test expert (`.claude/rules/test-expert.md`) |
| `seed.json` | Infra expert (`.claude/rules/infra-expert.md`) |
| `docs/playbooks/upstream-harvest.md`, `docs/playbooks/template-growth.md`, `scripts/harvest.mjs`, `scripts/lattice-harvest*.mjs`, `.lattice/harvest.json.example` | Harvest expert (`.claude/rules/harvest-expert.md`) |

## Slash commands (global experts)

Type `/` in Claude Code to attach a global expert:

| Command | Use when |
|---------|----------|
| `/debug` | Investigating failures, flakes, or non-obvious errors |
| `/janitor` | Consistency audits, dead code, dependency hygiene |

## Skills and MCP

Project skills (`explain-diff`, `lattice-smoke-test`, `sql-schema`, `stage-chunk`) are mirrored from `.cursor/skills/` into `.claude/skills/`.
Edit the `.cursor/` sources, not the Claude copies — they are overwritten on every sync.

---
_Managed by `npm run use:claude` / `npm run agents:sync`._
_Edit expert content in `agents/prompts/*.md`, then re-run to sync._
