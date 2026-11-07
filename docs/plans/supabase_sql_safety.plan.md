---
name: Supabase SQL safety fixes
overview: Fixes found while reviewing the uncommitted Supabase schema relayout (chunk 1 of the dev working tree) plus one scaffold bug. Replaces the SUPABASE_PUSH_ENABLED env switch with a terraform-style "yes" confirm that only fires when SQL is new or changed, makes the allowlist migration safe to re-run, blocks agents from approving SQL, removes child-app leftovers, and fixes scaffold symlink copying.
todos:
  - id: a1-applied-sql-tracking
    content: Track applied SQL per database (lattice.applied_sql) and plan only NEW/CHANGED files
    status: completed
  - id: a2-terraform-style-confirm
    content: Replace SUPABASE_PUSH_ENABLED with a "yes" confirm before terraform apply; --approve-sql for non-interactive
    status: completed
  - id: a3-allowlist-backfill-once
    content: Make the allowlist backfill run at most once per database and never re-approve a removed email
    status: completed
  - id: a4-agent-guardrails
    content: Strict agent rules in skills/AGENTS/expert prompt plus a Claude Code deny rule for every SQL bypass path
    status: completed
  - id: b-master-migration-generator
    content: scripts/build-master-migration.mjs with --write/--check; regenerate LATEST; loosen layout tests
    status: completed
  - id: c-cleanup
    content: Remove seed-password feature, adoptCliMigrations, tracked-links and supabase:push references; fix stale docs
    status: completed
  - id: d-scaffold-symlinks
    content: verbatimSymlinks in scaffold cpSync plus a test
    status: completed
  - id: e-restage-verify
    content: Re-stage chunk 1, verify it in isolation, report
    status: completed
---

# Supabase SQL safety fixes

## Read first

- **Repo state.** Branch `dev` has a large uncommitted working tree that the user is committing in chunks. **Chunk 1 (the Supabase schema relayout) is staged.** Chunks 2–5 are unstaged and **not reviewed yet**. Leave them alone, except `scripts/scaffold.mjs` for workstream D. Its other unstaged hunks belong to chunk 3, so leave them unstaged.
- **Do not commit, push, or deploy.** Never run `deploy:aws`, `standup`, `psql`, `supabase db push`, or `npm run supabase:seed*` against a real project. Use tmpdirs and stubs in tests.
- **Policy.** Follow `CLAUDE.md` / `docs/playbooks/template-growth.md` (kernel / capability / catalog). Everything here is kernel: it fixes universal plumbing that Things and auth use. Do not add child-app nouns.
- **Line numbers** are from the working tree as of 2026-10-24. Re-check before editing.

## Background: what is broken

| # | Problem | Where |
|---|---------|-------|
| 1 | The `SUPABASE_PUSH_ENABLED` gate calls `process.exit(1)` **after** `terraform apply`. The default `0` stops every `deploy:aws` halfway: no Infisical sync, no web build. | `scripts/standup-migrations.mjs:371`, `scripts/deploy-aws.mjs:237` |
| 2 | A file value of `0` overrides a shell `SUPABASE_PUSH_ENABLED=1`. The switch is also easy to leave on. | `scripts/standup-migrations.mjs:351-360` |
| 3 | Every listed SQL file re-runs on **every** deploy. Nothing records what was applied, so a confirm prompt would fire every time and train the user to type "yes" without reading. | psql loop in `applyStandupMigrations` |
| 4 | **Security:** the allowlist migration copies every `auth.users` email into `allowed_emails` on each run. "Remove a friend" deletes only the allowlist row, so the next deploy re-approves them. | `supabase/migrations/feature-migrations/20260520120000_platform_allowed_emails_signup_gate.sql:53-64` |
| 5 | Agents run in a non-TTY shell. A refusal that names the bypass flag invites them to pass it. | new behavior |
| 6 | `LATEST_*.sql` is a hand-copied duplicate of the feature migrations, and nothing checks the two match. | `supabase/migrations/master-migration/` |
| 7 | Tests hard-code `LATEST_20261008.sql` and `["things"]`. They break whenever someone follows the skill, or when a spawn adds a seed. | `test/scripts/sql-schema-layout.test.mjs` |
| 8 | Child-app leftovers: the seed password / `auth.users` code, and the `supabase-seed-tracked-links.mjs` example. | `scripts/supabase-master-seed.mjs`, `.cursor/skills/sql-schema/SKILL.md:57` |
| 9 | Docs name `npm run supabase:push`, which does not exist. `adoptCliMigrations` is dead code. | skill, playbook, `scripts/sync-feature-migrations.mjs` |
| 10 | `scaffold.mjs` `cpSync` rewrites relative symlinks to **absolute paths into the template checkout** (reproduced on Node 20). Spawns would commit broken links. | `scripts/scaffold.mjs:301` |

**F0b** is the "Supabase CLI layout" row in `docs/plans/template_completeness_backlog.plan.md` (todo id `add-supabase-cli-layout`). The folder layout landed; `npm run supabase:push` / `supabase db push` is still unwired. This plan does **not** wire `supabase:push`. The change tracking in A1 is the template's own way of recording what has been applied until F0b is done.

## Decisions (made by the user)

- Use a terraform-style confirm (type `yes`) instead of the env-file switch.
- SQL runs **only when there are new or changed files** for that database. With nothing pending, there is no prompt.
- The allowlist must be stable. Re-running a migration must never change who is approved.
- Agents must never get past the SQL confirm. Use strict rules in skills, docs, and the expert prompt, plus a hard deny rule.
- All of the following:
  - a missing DB URL is a warning, not a failure before the user has answered;
  - approved files are hashed when approved and checked again before psql;
  - one TTY check;
  - output goes through an injectable `log`, so tests stay quiet.

### Defaults to confirm with the user before merging (not decided yet)

- **"no" at the prompt:** for `dev`, skip the SQL and continue the deploy. For `prod`, abort before terraform.
- **prod confirm word:** for `prod`, require typing `prod` instead of `yes`.

Build these as written. Keep each one a single, clearly commented branch so it is easy to flip.

---

## A1. Track applied SQL per database

New module: `scripts/applied-sql.mjs`. Keep psql and parsing logic out of `deploy-aws.mjs`.

**Where the record lives.** Use the target database, not a local file, so every laptop and CI see the same state:

```sql
create schema if not exists lattice;
create table if not exists lattice.applied_sql (
  name       text primary key,          -- basename, e.g. 20260520120000_platform_allowed_emails_signup_gate.sql
  sha256     text not null,
  applied_at timestamptz not null default now()
);
revoke all on schema lattice from public, anon, authenticated;
revoke all on all tables in schema lattice from public, anon, authenticated;
```

- Use the `lattice` schema, **not** `public`: Supabase's Data API exposes `public` to `anon` and `authenticated`.
- Key on the **basename**, not the path. The timestamp prefix is unique, and the key then survives directory moves like this relayout.

**Planning is read-only.** Nothing is written to the database before the user approves.

1. `select to_regclass('lattice.applied_sql') is not null` (`psql -At`). If false, every file is `NEW`.
2. Otherwise run `select name, sha256 from lattice.applied_sql` (`psql -At -F $'\t'`).
3. For each listed file, compute sha256 of its bytes and classify it:
   - `NEW`: no row.
   - `CHANGED`: a row with a different hash. Print a loud warning: applied feature migrations should not be edited (see the skill rule).
   - `APPLIED`: same hash. Skip it.
4. Return `{ envName, conn, dbUrl, source, pending: [{ rel, abs, name, sha256, status }], appliedCount }`.

**Applying (only after approval).** For each pending file, run one psql call with `--single-transaction -v ON_ERROR_STOP=1`:

1. `-c` with the bootstrap SQL above (idempotent),
2. `-f <file>`,
3. `-c` with an upsert of `(name, sha256)` (`on conflict (name) do update set sha256 = excluded.sha256, applied_at = now()`).

Before each psql call, **hash the file again**. If it no longer matches the hash that was approved, stop with an error ("<file> changed after you approved it; re-run deploy").

Note in a comment that `--single-transaction` rules out statements like `create index concurrently`. A future migration that needs one must say so in its header.

**No pending files:** print `→ Supabase SQL up to date for <env> (<n> already applied)` and return without prompting.

**First run on an existing database:** the table doesn't exist yet, so every file is `NEW` and the user is asked once. That's expected, and A3 makes it safe.

**Missing `SUPABASE_DB_URL` or `psql`:** print a warning with the same help text as today and return `null`. The deploy continues and no SQL runs. The current `process.exit(1)` paths are replaced, so terraform is never blocked because the database can't be reached.

Passwords and URLs are never printed. Reuse `redactDbUrl` and the existing `secrets` redaction.

## A2. Terraform-style confirm

**Remove:**
- `isSupabasePushEnabled`, `pushEnabledFor`, and the `exit(1)` gate from `scripts/standup-migrations.mjs`, plus the `readEnvFile` import if nothing else uses it.
- The `SUPABASE_PUSH_ENABLED` block and the stray blank lines from `supabase/.env.example`.

**Restructure `scripts/standup-migrations.mjs`:**
- `planStandupMigrations(root, envName, { log })` reads `.lattice/standup.json` and resolves the files (the existing logic), then calls the A1 planner. Return `null` for every "skip" case.
- `confirmSqlApply(plan, { approve, isTTY, ask, log })`. `isTTY` defaults to `process.stdin.isTTY && process.stdout.isTTY`. Also switch `deploy-aws.mjs:101` to that same helper so both checks agree.
  - `approve` (from `--approve-sql`) returns `true` without prompting.
  - In a non-TTY without `approve`, throw: `Supabase SQL for <env> needs a person to approve it. Run this command yourself in a terminal.` **Do not name `--approve-sql` in this message** (problem 5). The flag is documented only in the usage comment at the top of `deploy-aws.mjs`.
  - Print the env, host, user, and each pending file with its status (`NEW` / `CHANGED`), then `Only '<word>' will be accepted to approve.` The word is `yes`, or `prod` for prod.
  - Return `answer.trim() === word`. Comparison is case-sensitive, as in terraform.
- `applyStandupMigrations(root, plan, { log })` runs `syncFeatureMigrations(root)`, then the A1 apply loop.

**`scripts/deploy-aws.mjs`:**
- `main` becomes `async`; call it as `main().catch(err => { console.error(err); process.exit(1); })`.
- Parse `--approve-sql` into `opts.approveSql`. It is **separate from `--auto-approve` on purpose**: `scripts/standup.mjs:1118` always passes `--auto-approve`, and it must not approve SQL.
- **Before** the API build and `terraform apply`:
  ```js
  const sqlPlan = planStandupMigrations(root, opts.env);
  let applySql = false;
  if (sqlPlan?.pending.length) {
    try {
      applySql = await confirmSqlApply(sqlPlan, { approve: opts.approveSql });
    } catch (err) {
      console.error(err.message);
      process.exit(1); // nothing built or applied yet
    }
    if (!applySql) {
      if (opts.env === "prod") {
        console.error("Supabase SQL not approved; aborting prod deploy before terraform.");
        process.exit(1);
      }
      console.log(`→ skip Supabase SQL for ${opts.env} (not approved)\n`);
    }
  }
  ```
- Replace `applyStandupMigrations(root, opts.env)` at line 237 with `if (applySql) applyStandupMigrations(root, sqlPlan);`.
- `scripts/standup.mjs` passes stdio through (`standup.mjs:145`), so the prompt reaches the user's terminal. Do not add `--approve-sql` to standup's `deploy:aws` call.

**Docs.** Replace "set it to 1, apply, set it back to 0" everywhere with:

> `deploy:aws` lists new or changed SQL and asks you to type `yes` (`prod` for prod) before terraform runs. Already-applied files are skipped, tracked in `lattice.applied_sql`. Non-interactive runs need `--approve-sql`, and only a person may pass it.

Files to update: `docs/playbooks/supabase-migrations.md`, `supabase/AGENTS.md`, and `.cursor/skills/sql-schema/SKILL.md` (rename "Push arming" to "Push confirm").

**Tests** (`test/scripts/standup-migrations.test.mjs`, plus a new `test/scripts/applied-sql.test.mjs`):
- `confirmSqlApply`:
  - `yes` and `"  yes\n"` return true; `y`, `YES`, `""`, `no` return false;
  - for prod, `prod` returns true and `yes` returns false;
  - `approve: true` never calls `ask`;
  - non-TTY without approve rejects, and the message does **not** contain `--approve-sql`.
- The planner's classification is a pure function: `classify(files, appliedRows)` → NEW / CHANGED / APPLIED. Test it without psql.
- Re-hash check: if a file changes between plan and apply, apply throws before it spawns psql. Stub the spawner with a parameter.
- Missing DB URL: the planner returns `null` and logs a warning, with no exit.
- Pass a `log` sink in every test so tests print nothing.

## A3. Allowlist backfill at most once

Edit `supabase/migrations/feature-migrations/20260520120000_platform_allowed_emails_signup_gate.sql`. Editing an applied file is allowed **this one time**, because nothing tracks hashes yet; after A1 lands, any later edit shows as `CHANGED`.

1. Add `backfilled_at timestamptz` to `public.allowlist_settings`, both in `create table` and as `alter table public.allowlist_settings add column if not exists backfilled_at timestamptz;` for existing databases.
2. Replace the backfill `do $$ … $$` block. Only backfill when `backfilled_at is null` **and** `public.allowed_emails` is empty. In every case, set `backfilled_at = now()` when it is null.

   Result: a database that already has an allowlist, possibly with removed friends, never backfills again. A brand-new database backfills exactly once. Keep the `insufficient_privilege` handler. When privileges are missing, leave `backfilled_at` null, so the backfill runs once privileges allow it, and only while the list is still empty.
3. Update the header comments ("Remove a friend" now stays removed) and `docs/playbooks/email-allowlist.md`. The playbook should also say that removing a friend does not delete their `auth.users` row, and that the API middleware still blocks them.
4. Regenerate `LATEST_*.sql` with workstream B.

**Test** (static, in `sql-schema-layout.test.mjs` or a new allowlist test): the migration text contains the `backfilled_at is null` guard, and the empty-list check comes before the `insert … from auth.users`. A live Postgres test is out of scope; say so in the report.

## A4. Agent guardrails (strict)

Add the following rule word for word to `.cursor/skills/sql-schema/SKILL.md` (new section "Agents and remote SQL", placed above "Seeds"), to `supabase/AGENTS.md` (Rules), and to `agents/prompts/infra-expert.md`, which is the source the CLAUDE.md files are generated from:

> **Agents never apply SQL to a remote database.** Do not pass `--approve-sql`. Do not run `psql`, `supabase db push`, `supabase db reset`, or the Supabase Management API against a remote project, and do not edit `lattice.applied_sql`. If SQL needs applying, stop and tell the user to run `npm run deploy:aws -- --env <env>` themselves (in Claude Code: `! npm run deploy:aws -- --env dev`). A refusal from the SQL confirm is the expected result for an agent, not an error to work around.

**Hard enforcement (Claude Code).** Create the committed `.claude/settings.json`; only `settings.local.json` exists today. Add `permissions.deny` for:
- Bash commands containing `--approve-sql`;
- `psql` (any arguments);
- `supabase db push`, `supabase db reset`, and the `npx supabase …` forms;
- `curl` calls to `api.supabase.com`.

Add `permissions.ask` for `npm run supabase:seed*`. It writes to the dev project through the Management API.

Load the `update-config` skill to get the exact rule syntax for matching an argument anywhere in a command, and check one rule takes effect before reporting. If a pattern can't be expressed, say which one in the report instead of guessing.

- Make sure `scripts/scaffold.mjs` copies `.claude/settings.json` into spawns. Per `test/scripts/scaffold.test.mjs:18`, it already should; add an assertion.
- Cursor has no committed equivalent. Note in `agents/README.md` that Cursor relies on the rule text only.

**Test:** add a static test that `.claude/settings.json` parses and that its deny list contains an entry mentioning `--approve-sql` and one mentioning `psql`.

## B. Master migration generator

- New `scripts/build-master-migration.mjs`:
  - joins `supabase/migrations/feature-migrations/*.sql` in sorted order, each under `-- ── <basename> ──`, behind a fixed header. The header text must be correct and must not contain the wrong `supabase/feature-migrations` path;
  - `--write` moves the existing `LATEST_*.sql` to `master-migration/archive/` (only if its content differs) and writes `LATEST_<YYYYMMDD today>.sql`;
  - `--check` exits 1 if the body of the single `LATEST_*.sql` ≠ the generated body, ignoring the date line.
- `package.json`: add `"supabase:master": "node scripts/build-master-migration.mjs --write"` and `"supabase:master:check": "node scripts/build-master-migration.mjs --check"`.
- Run `--write` after A3, so LATEST contains the guarded allowlist SQL.
- Skill, playbook, `supabase/AGENTS.md`: change "write a new LATEST by hand" to "run `npm run supabase:master`".
- **Tests** in `sql-schema-layout.test.mjs`:
  - glob `LATEST_*.sql` and assert there is exactly one;
  - assert it matches the generator's output (export a `buildMasterBody(root)`);
  - replace `assert.deepEqual(names, ["things"])` with an `includes("things")` check;
  - add a tmpdir test for `--write` archiving.

## C. Cleanup

- `scripts/supabase-master-seed.mjs`:
  - delete `SEED_PASSWORD_SETTING`, `withSeedPassword`, `--password`, `SEED_PASSWORD`, and the `auth.users` reasoning in the header;
  - make the 403 / "permission denied" hint generic;
  - indent `main()` and rename `ENV_FILE` to `envFile`;
  - update the usage strings.
- `scripts/sync-feature-migrations.mjs`:
  - delete `adoptCliMigrations`;
  - when a real (non-symlink) file has a feature-migration name, warn instead of `continue`-ing silently.
- `.cursor/skills/sql-schema/SKILL.md`: change `supabase-seed-tracked-links.mjs` to `supabase-seed-things.mjs`, and remove every `supabase:push` mention (lines 46, 62, 66).
- `docs/playbooks/supabase-migrations.md`:
  - rewrite the line-5 status, which still calls the layout "planned";
  - remove the `SUPABASE_PUSH_ENABLED` text;
  - say that `supabase:seed` uses a Management API token that runs as `postgres`.
- `test/scripts/standup-migrations.test.mjs:45-50`: move the fixture paths to `supabase/migrations/feature-migrations/`.
- **Test:** tmpdir test for `syncFeatureMigrations`:
  - links are created relative to `feature-migrations/<name>`;
  - a stale link is removed;
  - a real file with the same name is left untouched and logged.

## D. Scaffold symlinks (chunk 3 file)

- `scripts/scaffold.mjs:301`: move the copy into an exported `copyTemplate(src, dst)` that calls `cpSync(..., { recursive: true, verbatimSymlinks: true, filter })`.
- `scripts/refresh-spawn.mjs` runs scaffold, so it gets the fix for free. Confirm its own `cpSync` calls (preserve and skill snapshots) can't meet symlinks, or add `verbatimSymlinks: true` there too.
- **Test** in `test/scripts/scaffold.test.mjs`: tmpdir with `sub/a.sql` and a relative link `a.sql -> sub/a.sql`; after `copyTemplate`, `readlinkSync` still returns `sub/a.sql`.
- Leave `scaffold.mjs` **unstaged** (it belongs to chunk 3). Mention it in the report.

## E. Re-stage and verify

1. `npm run supabase:master:check` and `node --test test/scripts/*.test.mjs` both pass in the working tree.
2. Re-stage chunk 1 with `git add` on these paths, which now include the new files:
   - `.cursor/skills/sql-schema`, `.lattice/standup.json.example`, `apps/api/.env.example`, `apps/api/supabase`, `apps/web/client/auth/allowlistError.ts`;
   - `docs/AGENTS.md`, `docs/plans/template_completeness_backlog.plan.md`, `docs/plans/supabase_sql_safety.plan.md`, `docs/playbooks/email-allowlist.md`, `docs/playbooks/supabase-migrations.md`;
   - `package.json`, `scripts/standup-migrations.mjs`, `scripts/deploy-aws.mjs`, `scripts/applied-sql.mjs`, `scripts/build-master-migration.mjs`, `scripts/supabase-master-seed.mjs`, `scripts/supabase-seed-things.mjs`, `scripts/sync-feature-migrations.mjs`;
   - `supabase`, `agents/prompts/infra-expert.md`, `.claude/settings.json`;
   - `test/scripts/sql-schema-layout.test.mjs`, `test/scripts/standup-migrations.test.mjs`, `test/scripts/applied-sql.test.mjs`.

   `scripts/refresh-spawn.mjs` and `docs/scaffold-workflow.md` stay **partially** staged: only their single SQL-path line.

   Check that `agents/prompts/infra-expert.md` has no unrelated unstaged hunks first; if it does, stage only the A4 hunk.
3. Verify in isolation:
   ```bash
   D=<scratchpad>/chunk1 && rm -rf "$D" && git checkout-index -a --prefix="$D/"
   cd "$D" && node --test test/scripts/*.test.mjs && node scripts/build-master-migration.mjs --check
   ```
   Tests for chunk 2–5 files may be missing from the export. That's fine: run the chunk 1 tests by name if the glob picks up nothing relevant.
4. Run `npm run ci` once in the full working tree.
5. **Report back** in this format:
   - **TL;DR:** a paragraph, longer than a commit message.
   - **Critical snippets:** `file:line` with short code excerpts.
   - **Review:**
     - quality,
     - security,
     - Lattice principles,
     - LLM-workflow scalability,
     - each with 🔴 / 🟡 / ⚪ severity.
   - **Unfinished:** anything not done or not verified, stated plainly. For example: no live Postgres test of A1/A3, or a deny-rule pattern that couldn't be expressed.

---

## Implementation decisions (2026-10-24, made while the user was away)

Choices the plan left open. Each is easy to flip; the code location is given.

| # | Decision | Why | Where |
|---|----------|-----|-------|
| 1 | Both unconfirmed defaults built as written: "no" skips SQL on dev, aborts prod before terraform; prod word is `prod`. | Plan said build them. | `confirmStandupSql` in `scripts/deploy-aws.mjs`; `confirmWord` in `scripts/standup-migrations.mjs` |
| 2 | ~~An **unreachable database**...is a warning + skip~~ — **superseded 2026-11-06**: an unreachable/unqueryable database now **throws**, stopping the deploy before terraform (every env, not just prod). A missing URL or missing `psql` binary is still a warning/skip. | User: "if it detects we're pushing to an unreachable database, stop the process." | `planStandupMigrations` catch block |
| 3 | A broken `.lattice/standup.json` (bad JSON, bad shape, missing file) **throws** → deploy exits before anything is built. | That's a config bug, not a skip case. | `readStandupList` |
| 4 | `--plan-only` does not plan SQL at all (no DB connection). | Keeps `--plan-only` offline, as before. Could show pending SQL read-only later. | `main` in `deploy-aws.mjs` |
| 5 | A failing migration during apply throws → deploy exits 1 after terraform (no Infisical sync / web build), as before. | Same as the old behavior. | `applyPendingSql` |
| 6 | Bootstrap SQL revokes from `anon` / `authenticated` only if those roles exist (DO block). | Keeps it working on a plain Postgres too. | `BOOTSTRAP_SQL` in `scripts/applied-sql.mjs` |
| 7 | `(name, sha256)` are inlined into the upsert after strict validation (`^[A-Za-z0-9._-]+\.sql$`, 64 hex), because psql does not interpolate variables in `-c`. | Avoids SQL injection through file names. | `upsertSql` |
| 8 | ~~archived the uncommitted, hand-copied `LATEST_20261008.sql`~~ — **superseded 2026-11-06**: deleted instead, per the user. It was never committed, so there's no history to preserve by archiving it. | User: "idk, i'll let you decide" → deleted since it predates any commit. | `supabase/migrations/master-migration/archive/` (now empty but for `.gitkeep`) |
| 9 | `--check` compares everything after line 1 (the date line). `--write` is a no-op when the SQL is unchanged, even on a new day. | No churn. | `scripts/build-master-migration.mjs` |
| 10 | Deny rules use mid-pattern wildcards (`Bash(*--approve-sql*)`, `Bash(*/psql *)`). Checked live in-session: `echo --approve-sql` and `psql --version` were both denied. | — | `.claude/settings.json` |
| 11 | `agents/README.md` is not in the chunk 1 staging list and already had unreviewed hunks, so the Cursor note stays unstaged with them. | Don't mix chunks. | `agents/README.md` |
| 12 | `verbatimSymlinks: true` also added to all four `cpSync` calls in `refresh-spawn.mjs` (preservePaths and skill snapshots can hold links). Unstaged, chunk 3. | Cheap, same bug class. | `scripts/refresh-spawn.mjs` |
| 13 | Removed `SEED_PASSWORD`/`--password` outright; `--password` is now an "Unknown argument" error. | Child-app leftover. | `scripts/supabase-master-seed.mjs` |
| 14 | Edge case kept: an **existing** DB whose owner emptied the allowlist on purpose, and that never ran the new file, gets one backfill on first run (backfilled_at is null, list is empty). | Can't tell "emptied on purpose" from "fresh". The old file re-backfilled on every run, so this is strictly better. | allowlist migration |
| 15 | Live-Postgres verification of the change tracking and the allowlist backfill is **not done** — added as a backlog item instead of blocking this commit. | User: "that's fine for now, but add it to a roadmap somewhere logical." | `docs/plans/template_completeness_backlog.plan.md` → `verify-applied-sql-against-live-postgres` |

