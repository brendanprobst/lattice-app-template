# Cursor project rules

These `.mdc` files define **expert personas** for this repo.

| Rule file | When it applies |
|-----------|------------------|
| `ddd-expert.mdc` | Automatically when you work under `apps/api/domain/`, `apps/api/application/`, or `docs/adr/`. |
| `test-expert.mdc` | Automatically when you work under `test/api/`, `test/web/`, or **feature code** under `apps/api/`, `apps/web/client/`, or `apps/web/app/` (tests-first alongside implementation). |
| `infra-expert.mdc` | Automatically when you work under `apps/api/infrastructure/`, `apps/api/config/`, **`apps/web/client/lib/`**, or root `seed.json`. |
| `harvest-expert.mdc` | Automatically on harvest playbooks, `docs/research/harvests/`, and harvest scripts. |
| `template-growth.mdc` | **Always on** — kernel vs capability vs catalog. Highest priority for template surface changes. |
| `debugger-expert.mdc` | **Not** path-scoped — attach manually (see below). |
| `code-janitor.mdc` | **Not** path-scoped — attach manually (see below). |

## Attaching global experts (`@`)

In **Chat** or **Composer**, type **`@`** → **Rules** (wording may be **Cursor Rules** in your build) → select **Debugger expert** or **Code janitor**.

Fallback: **`@`** → **Files** → `.cursor/rules/debugger-expert.mdc` or `code-janitor.mdc` to pull the rule text into context.

Scoped rules still apply from file paths; `@` adds the global expert when you need it (e.g. debugging outside `test/api/`, or a janitor pass on the whole tree).
