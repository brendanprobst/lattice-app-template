# Agent prompt framework

This folder holds **prompts** plus a **registry** that lines up with **Cursor project rules** in `../.cursor/rules/`.

## Cursor integration

| Kind | How it activates |
|------|-------------------|
| **Path-scoped experts** (DDD, test, infra) | Cursor loads the matching `.mdc` rule when you edit files under the globs in each rule. See `.cursor/rules/README.md`. |
| **Global experts** (debugger, code janitor) | No auto glob — in **Chat** or **Composer**, type **`@`**, choose **Rules** (or **Cursor Rules**), then pick **Debugger expert** or **Code janitor**. |

### Tests-first feature work (Test expert)

Cursor does **not** run a separate “test agent” on save or commit. **Automatic rule context** is what you get: the **Test expert** rule (`.cursor/rules/test-expert.mdc`) applies when you edit **`test/**`** *or* application code under **`apps/api/`**, **`apps/web/client/`**, or **`apps/web/app/`**. That loads test conventions in the same session as other path rules (e.g. DDD), steering the model to **add or update tests with the feature** unless you explicitly want a spike without tests.

**Stronger gates:** required **`ci`** check + branch protection; **`.github/pull_request_template.md`** checklist; optional local **pre-push** `npm run ci`.

Rule bodies live in `.cursor/rules/*.mdc`; short mirrors and `@` hints live under `prompts/`.

## Layout

- **`prompts/_template.md`** — Copy when adding a new agent.
- **`prompts/registry.yaml`** — ids, paths, globs, and how to attach global rules.
- **`prompts/*.md`** — One stub per expert (links to the canonical `.mdc`).

## Adding an agent

1. Add `.cursor/rules/<id>.mdc` with YAML frontmatter (`description`, `globs` and/or `alwaysApply`).
2. Add `prompts/<id>.md` and an entry in `registry.yaml`.
3. For **global** personas, omit `globs` and set `alwaysApply: false` so they are mainly used via **`@` → Rules**.

## Usage (non-Cursor)

Open a file under `prompts/` and paste into any LLM session, or point automation at `registry.yaml`.
