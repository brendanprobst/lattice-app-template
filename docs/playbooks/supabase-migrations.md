# Supabase migrations (CLI)

Run database schema changes from the terminal and keep **one Supabase project per spawn repo** (smoke-test, runout, each new app). The API uses Supabase via PostgREST with the **service role**; this playbook is only for **DDL/migrations**, not runtime auth.

**Status:** The template ships SQL under `apps/api/supabase/migrations/` for documentation and manual apply. Full **Supabase CLI** wiring (`supabase/` at repo root, `npm run supabase:push`) is **planned** — follow this playbook manually until that lands (see [Template backlog](../plans/template_completeness_backlog.plan.md)).

---

## One project per repository

| Repo | Typical Supabase project |
|------|---------------------------|
| `lattice-app-smoke-test` | Canary / deploy smoke project |
| Product child app (e.g. runout) | That app’s project |
| New app after `npm run scaffold` | New project you create at first deploy |

Linking is **per git clone**, not global. `NEXT_PUBLIC_SUPABASE_URL` in env does **not** replace `supabase link` — the CLI needs an explicit link or database URL to apply migrations.

---

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`brew install supabase/tap/supabase` or see docs)
- A hosted Supabase project for **this** repo
- **Project ref** from the dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`

---

## First-time setup (per repo)

From the **monorepo root** of the spawn (e.g. `lattice-app-smoke-test/`):

```bash
supabase login                    # personal access token (one-time per machine)

supabase init                     # creates supabase/config.toml (when CLI layout is adopted)

supabase link --project-ref <project-ref>
```

`supabase link` stores connection metadata locally; do **not** commit database passwords. When the template adds a standard `supabase/` tree, commit `config.toml` and migration files; gitignore link/cache artifacts per [Supabase docs](https://supabase.com/docs/guides/cli).

### Planned layout (not in template yet)

The CLI expects migrations at **repo root**:

```text
supabase/
  config.toml
  migrations/
    20260520120000_allowed_emails_signup_gate.sql
```

Today, reference SQL lives at:

```text
apps/api/supabase/migrations/allowed_emails_signup_gate.sql
```

Until migrations move (or are mirrored) under `supabase/migrations/` with **timestamp prefixes** (`YYYYMMDDHHMMSS_name.sql`), use **psql** or paste into the SQL editor (see [Apply without full CLI layout](#apply-without-full-cli-layout)).

---

## Apply migrations (linked project)

When `supabase/migrations/` is wired:

```bash
supabase db push --dry-run    # preview pending files
supabase db push              # apply to linked remote project
supabase migration list       # local vs remote history
```

The remote tracks applied files in `supabase_migrations.schema_migrations`. Re-running `db push` skips migrations already applied.

**Rule:** After you adopt CLI migrations, make schema changes **only** through migration files — not ad-hoc in the dashboard SQL editor — or `db push` will drift and require [`migration repair`](https://supabase.com/docs/reference/cli/supabase-migration-repair).

---

## Apply without full CLI layout

For the current template path (single allowlist migration, or before `supabase init`):

**Option A — psql as `postgres` (recommended for `auth.users` triggers)**

Some migrations (e.g. [email allowlist](email-allowlist.md)) need **`TRIGGER` on `auth.users`**, which the dashboard SQL editor often cannot create. Use the direct connection string from **Project Settings → Database**:

```bash
psql "postgresql://postgres:<password>@<host>:5432/postgres" \
  -f apps/api/supabase/migrations/allowed_emails_signup_gate.sql
```

**Option B — Supabase SQL editor**

Fine for idempotent `public` schema changes when triggers are not required. See the allowlist playbook if the trigger step fails.

**Option C — `db push` with explicit URL (CI)**

```bash
supabase db push --db-url "$SUPABASE_DB_URL"
```

Use the **direct** Postgres URL (not the transaction pooler) for DDL. Store the URL in GitHub Actions secrets or a local env file — never commit it.

---

## Per-repo workflow after template refresh

When you [refresh a spawn](../scaffold-workflow.md#refresh-an-existing-spawn-re-sync-from-template) and new SQL appears under `apps/api/supabase/migrations/`:

1. Read what changed (filename / comments in the migration).
2. Apply to **that repo’s** Supabase project (CLI or psql above).
3. Run app-level flags if the migration docs say so (e.g. allowlist: `set_allowlist_enabled(true)` + API env).

Do **not** run smoke-test migrations against runout’s project or vice versa.

---

## Existing database already changed by hand

If you applied SQL via the dashboard before using the CLI:

1. `supabase migration list` — compare local files vs remote history.
2. `supabase db pull` — optional: capture remote schema into a new migration file.
3. `supabase migration repair` — if the CLI reports history mismatch.

Prefer fixing history once, then only use migration files going forward.

---

## CI (optional, later)

Example pattern for GitHub Actions on a spawn repo:

```yaml
- uses: supabase/setup-cli@v1
- run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
- run: supabase db push
```

Or pass `--db-url` from a secret. Gate on `main` or a deploy workflow — not required for local dev.

---

## Related

- [Email allowlist](email-allowlist.md) — first migration that needs `postgres` / CLI for triggers
- [Smoke test deployment guide](../plans/smoke_test_deployment_guide.plan.md) — Supabase project + env before AWS deploy
- [Scaffold workflow](../scaffold-workflow.md) — greenfield spawn and refresh checklist
- [Supabase CLI reference](https://supabase.com/docs/reference/cli/introduction)
