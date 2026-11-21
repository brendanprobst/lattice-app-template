# Supabase migrations (CLI)

Run database schema changes from the terminal and keep **one Supabase project per spawn repo** (smoke-test, runout, each new app). The API uses Supabase via PostgREST with the **service role**; this playbook is only for **DDL/migrations**, not runtime auth.

**Status:** The `supabase/` layout is in the template (see [Layout](#layout)). Laptop **`npm run deploy:aws`** / **`npm run standup -- --env <env>`** apply the new or changed files in **`.lattice/standup.json`** after a person approves them (see [Standup apply](#standup-apply)). A `supabase db push` wrapper is not wired yet (backlog row F0b in the [Template backlog](../plans/template_completeness_backlog.plan.md)).

---

## One project per repository

| Repo | Typical Supabase project |
|------|---------------------------|
| `lattice-app-smoke-test` | Canary / deploy smoke project |
| Product child app (e.g. runout) | That app’s project |
| New app after `npm run scaffold` | New project you create at first deploy |

Linking is **per git clone**, not global. `NEXT_PUBLIC_SUPABASE_URL` in env does **not** replace `supabase link` — the CLI needs an explicit link or database URL to apply migrations.

---

## Standup apply

Before terraform runs, `deploy:aws` reads `lattice.applied_sql` in the target database (read-only) and lists each path in `.lattice/standup.json` for that `--env` that is `NEW` or `CHANGED`. After a successful `terraform apply` it runs `psql -f` on the approved files, one `--single-transaction` per file together with its tracking row. Copy [`.lattice/standup.json.example`](../../.lattice/standup.json.example). Refresh preserves `.lattice/standup.json`.

```json
{
  "migrations": {
    "dev": [
      "supabase/migrations/feature-migrations/20260520120000_platform_allowed_emails_signup_gate.sql",
      "supabase/migrations/feature-migrations/20260520120100_app_things.sql"
    ],
    "prod": [
      "supabase/migrations/feature-migrations/20260520120000_platform_allowed_emails_signup_gate.sql",
      "supabase/migrations/feature-migrations/20260520120100_app_things.sql"
    ]
  }
}
```

A top-level `"migrations": ["…"]` array applies to every env. Missing file or empty list is a skip, not a failure. List feature migrations only. Do not list `master-migration/LATEST_*.sql` or anything under `seed/`. Demo Thing rows are `npm run supabase:seed` (dev only).

`deploy:aws` lists new or changed SQL and asks you to type `yes` (`prod` for prod) before terraform runs. Already-applied files are skipped, tracked in `lattice.applied_sql`. Non-interactive runs need `--approve-sql`, and only a person may pass it.

- Nothing pending: it prints `Supabase SQL up to date` and does not ask.
- Answer anything else on `dev`: the SQL is skipped and the deploy continues. On `prod`: the deploy stops before terraform.
- `CHANGED` means a file was edited after it was applied. Applied feature migrations should not be edited; add a new one.
- First run on an existing database: `lattice.applied_sql` does not exist yet, so every file is `NEW` and you are asked once. The template migrations are idempotent, and the allowlist backfill runs at most once.
- `lattice.applied_sql` lives in the private `lattice` schema (not exposed by the Data API). Files are keyed by basename, so moving a file between folders does not make it look new.
- A file that needs a statement which cannot run in a transaction (`create index concurrently`) must say so in its header and be applied by hand.

**Connection** (laptop only, never committed): `SUPABASE_DB_URL` in the shell, else `supabase/.env.<env>` (`supabase/.env.prod` for prod; first of `.env.dev` / `.env.local` / `.env` for dev). Copy `supabase/.env.example`. Session pooler on port 5432 is fine; do not use the transaction pooler (6543). `psql` must be on `PATH`. A missing URL or missing `psql` is a warning: the deploy continues without SQL. An **unreachable database** (you have a connection target, but it fails to connect or can't be queried) stops the deploy before terraform runs. A failing migration during apply stops the deploy after terraform. The URL and password are never printed.

`--bootstrap-only` and `--plan-only` do not run SQL. GitHub **Deploy app** does not run SQL.

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

### Layout

```text
supabase/migrations/
  master-migration/
    archive/
    LATEST_YYYYMMDD.sql
  feature-migrations/
    YYYYMMDDHHMMSS_platform_<name>.sql
    YYYYMMDDHHMMSS_app_<name>.sql
  seed/features/
    <feature>.sql
    <feature>_down.sql
  YYYYMMDDHHMMSS_*.sql    # symlinks into feature-migrations
```

`LATEST_YYYYMMDD.sql` creates the whole schema on an empty database. When the schema changes, run `npm run supabase:master`: it moves the old file to `archive/` and writes a new one from the feature migrations in timestamp order. `npm run supabase:master:check` fails when LATEST is stale. The CLI applies only timestamped files directly in `supabase/migrations/` (the symlinks). It does not apply subfolders, so the master file and the seeds stay out of a push. `npm run supabase:seed` applies every feature; `npm run supabase:seed:things` applies the Thing demo rows. Seeds go through the Supabase Management API with `SUPABASE_ACCESS_TOKEN`, and that SQL runs as `postgres` on the dev project. A seed row whose referenced id is missing is skipped; the rest of that file still applies. A missing table still stops the file.

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

These are for a person at a terminal. SQL applied this way is not recorded in `lattice.applied_sql`, so the next `deploy:aws` lists it as `NEW` (safe for the template's idempotent files).

**Option A — psql as `postgres` (recommended for `auth.users` triggers)**

Some migrations (e.g. [email allowlist](email-allowlist.md)) need **`TRIGGER` on `auth.users`**, which the dashboard SQL editor often cannot create. Use the direct connection string from **Project Settings → Database**:

```bash
psql "postgresql://postgres:<password>@<host>:5432/postgres" \
  -f supabase/migrations/feature-migrations/20260520120000_platform_allowed_emails_signup_gate.sql
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

When you [refresh a spawn](../scaffold-workflow.md#refresh-an-existing-spawn-re-sync-from-template) and new SQL appears under `supabase/migrations/feature-migrations/`:

1. Read what changed (filename / comments in the migration).
2. Apply to **that repo’s** Supabase project (CLI or psql above).
3. Run app-level flags if the migration docs say so (e.g. allowlist: `set_allowlist_enabled(true)` + API env).

Do **not** run smoke-test migrations against runout’s project or vice versa.

### Migrating a spawn from `apps/api/supabase/`

Spawns scaffolded before the `supabase/migrations/` layout still have the old SQL, and refresh keeps their `.lattice/standup.json` as-is. `deploy:aws` refuses any listed path under `apps/api/supabase/migrations/` and stops before terraform. Once per spawn:

1. In `.lattice/standup.json`, replace the old paths for each env:
   - `apps/api/supabase/migrations/allowed_emails_signup_gate.sql` → `supabase/migrations/feature-migrations/20260520120000_platform_allowed_emails_signup_gate.sql`
   - `apps/api/supabase/migrations/things.sql` → `supabase/migrations/feature-migrations/20260520120100_app_things.sql`
   - Any spawn-only file: move it into `feature-migrations/` with a `YYYYMMDDHHMMSS_app_` prefix, list the new path, and run `npm run supabase:master`.
2. Add `"apps/api/supabase"` to `prunePaths` in `.lattice/refresh.json`, so the next refresh deletes the old folder.
3. Run `npm run deploy:aws -- --env dev` yourself. Both feature migrations show as `NEW` because the database has never tracked them. That is expected and safe: the allowlist migration only backfills from `auth.users` while `allowed_emails` is empty, so nobody you removed is re-approved. The Thing demo rows are no longer in the migration; run `npm run supabase:seed:things` if you want them.

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
