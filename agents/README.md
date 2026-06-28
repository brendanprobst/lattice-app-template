# Agent prompt framework

This folder is the **source of truth** for all expert personas in this repo.
Both Cursor and Claude Code configs are generated from `agents/prompts/*.md` — neither
tool's native format is the master. Generated files are committed to git so both sets
can coexist in history.

## Switching between tools

```bash
npm run use:claude   # generate CLAUDE.md files; remove .cursor/rules/*.mdc
npm run use:cursor   # generate .cursor/rules/*.mdc; remove CLAUDE.md files
npm run agents:sync  # generate both (for teams using both tools simultaneously)
npm run agent:status # show which mode is currently active
```

After switching, stage and commit so git history reflects the active tool:
```bash
git add -A && git commit -m "chore: activate Claude agent mode"
```

**Editing expert content:** change `agents/prompts/<id>.md`, then re-run the appropriate
command above to regenerate. The `description` and glob metadata live in `registry.yaml`.

## How each tool uses the generated configs

**Cursor** (`.cursor/rules/*.mdc`):

| Kind | How it activates |
|------|-------------------|
| **Path-scoped experts** (DDD, test, infra) | Cursor loads the rule automatically when you edit files under the configured globs. |
| **Global experts** (debugger, code janitor) | Attach manually: in Chat or Composer type **`@`** → **Rules** → select the expert. |

The Test expert rule activates on **`test/**`** *and* **`apps/api/`**, **`apps/web/client/`**, **`apps/web/app/`**
so test conventions are in context alongside the feature you're implementing (tests-first).

**Claude Code** (`CLAUDE.md` files):

Claude Code reads `CLAUDE.md` hierarchically — the file closest to what you're editing wins,
with all parent-directory files also loaded. Expert guidance is injected automatically:

| Directory | Expert loaded |
|-----------|---------------|
| `apps/api/domain/`, `apps/api/application/`, `docs/adr/` | DDD expert |
| `apps/api/`, `apps/web/client/`, `apps/web/app/`, `test/api/`, `test/web/` | Test expert |
| `apps/api/infrastructure/`, `apps/api/config/`, `apps/web/client/lib/` | Infrastructure expert |

Global experts are available as slash commands: `/debug` and `/janitor`.

## Layout

```
agents/
  prompts/
    registry.yaml      ← glob metadata + descriptions (used for .mdc frontmatter generation)
    ddd-expert.md      ← expert body content (edit here)
    test-expert.md
    infra-expert.md
    debugger-expert.md
    code-janitor.md
    _template.md       ← copy when adding a new expert
```

## Adding an expert

1. Copy `agents/prompts/_template.md` to `agents/prompts/<id>.md` and write the expert content.
2. Add an entry to `agents/prompts/registry.yaml` with `description` and `globs` (path-scoped) or `command` (global).
3. Add the agent to `PATH_AGENTS` or `GLOBAL_AGENTS` in `scripts/use-agent.mjs`.
4. Re-run `npm run use:claude`, `npm run use:cursor`, or `npm run agents:sync` to generate.

## Removing an expert

Remove in this order to avoid errors:
1. Remove the agent from `PATH_AGENTS` or `GLOBAL_AGENTS` in `scripts/use-agent.mjs`.
2. Remove the entry from `agents/prompts/registry.yaml`.
3. Delete `agents/prompts/<id>.md`.
4. Re-run the appropriate generate command — it will leave the now-orphaned output files in place; delete those manually or with `git rm`.
