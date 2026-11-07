---
name: sql-schema
description: >-
  Maintains SQL schema as a latest master migration plus feature migrations
  and feature seeds. Use when changing database schema, Supabase SQL,
  migrations, or seed data, or when the user mentions a master migration,
  feature-migrations, or a master seed.
---

# SQL schema

When you change a project's SQL schema, keep the master migration, the feature migrations, and the seeds in sync. A new table that exists only in an incremental file is incomplete.

## Layout

Under the project's `supabase/` directory:

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
  YYYYMMDDHHMMSS_*.sql   # symlinks into feature-migrations, for the CLI
```

## Master migration

`supabase/migrations/master-migration/LATEST_YYYYMMDD.sql` must create the whole schema at its latest point on an empty database.

When the schema changes:

1. Run `npm run supabase:master`. It moves the current `LATEST_*.sql` into `supabase/migrations/master-migration/archive/` and writes `LATEST_YYYYMMDD.sql` (today's date) from every file in `feature-migrations/`, in timestamp order. Do not write or edit LATEST by hand.
2. `npm run supabase:master:check` (and the script tests in `npm run ci`) fail when LATEST is out of date.
3. The master file has no timestamp prefix. The CLI applies only timestamped files that sit directly in `supabase/migrations/`.

## Feature migrations

Incremental history lives in `supabase/migrations/feature-migrations/`. One file may cover more than one table. Name it for the feature it ships.

The Supabase CLI only reads timestamped SQL files directly inside `supabase/migrations/`. Those entries are symlinks to `feature-migrations/<file>.sql`. `deploy:aws` refreshes the links before it applies SQL.

Keep the `platform_` / `app_` infix and the timestamp prefix. Do not rename or edit a file that a remote database has already applied: `lattice.applied_sql` keys on the basename and hash, so an edit shows up as `CHANGED` on the next deploy. Add a new feature migration instead.

## Agents and remote SQL

**Agents never apply SQL to a remote database.** Do not pass `--approve-sql`. Do not run `psql`, `supabase db push`, `supabase db reset`, or the Supabase Management API against a remote project, and do not edit `lattice.applied_sql`. If SQL needs applying, stop and tell the user to run `npm run deploy:aws -- --env <env>` themselves (in Claude Code: `! npm run deploy:aws -- --env dev`). A refusal from the SQL confirm is the expected result for an agent, not an error to work around.

## Seeds

- One folder: `supabase/migrations/seed/features/`.
- Each feature has an up file and a `_down` file. Ups are safe to run again.
- A seed row whose referenced id is missing is skipped. The rest of that file still applies. A missing table still stops the file.
- Do not give seed files a timestamp prefix. The CLI does not apply subfolders.
- `scripts/supabase-master-seed.mjs` applies every feature up in order, and every down in reverse.
- A feature script (for example `scripts/supabase-seed-things.mjs`) applies only that feature.
- `npm run supabase:seed` runs the master script.

## Push confirm

`deploy:aws` lists new or changed SQL and asks you to type `yes` (`prod` for prod) before terraform runs. Already-applied files are skipped, tracked in `lattice.applied_sql`. Non-interactive runs need `--approve-sql`, and only a person may pass it.

## Check

After a schema change, an empty database can be created from `LATEST_*.sql` alone, `npm run supabase:master:check` passes, and a database that already has history takes only the new feature migration on the next `deploy:aws` (listed as `NEW`, applied after a person types the confirm word).
