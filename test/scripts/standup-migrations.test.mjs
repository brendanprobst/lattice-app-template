import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  confirmSqlApply,
  confirmWord,
  LEGACY_MIGRATION_PATHS,
  parsePostgresConn,
  parseStandupMigrations,
  planStandupMigrations,
  redactDbUrl,
  resolveDbUrl,
  resolveMigrationFiles,
} from "../../scripts/standup-migrations.mjs";

test("parseStandupMigrations reads a per-env list", () => {
  const files = parseStandupMigrations(
    { migrations: { prod: ["a.sql"], dev: ["b.sql"] } },
    "prod",
  );
  assert.deepEqual(files, ["a.sql"]);
});

test("parseStandupMigrations treats a top-level list as every env", () => {
  assert.deepEqual(parseStandupMigrations({ migrations: ["shared.sql"] }, "dev"), [
    "shared.sql",
  ]);
});

test("parseStandupMigrations returns empty when the env has no key", () => {
  assert.deepEqual(parseStandupMigrations({ migrations: { prod: ["a.sql"] } }, "dev"), []);
});

test("resolveMigrationFiles rejects traversal and missing files", () => {
  const root = mkdtempSync(join(tmpdir(), "standup-mig-"));
  const dir = "supabase/migrations/feature-migrations";
  mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, dir, "ok.sql"), "select 1;\n");
  const ok = resolveMigrationFiles(root, [`${dir}/ok.sql`]);
  assert.equal(ok.length, 1);
  assert.throws(() => resolveMigrationFiles(root, ["../outside.sql"]), /repo-relative/);
  assert.throws(() => resolveMigrationFiles(root, [`${dir}/missing.sql`]), /missing/);
});

test("resolveMigrationFiles refuses old apps/api/supabase paths, even when the file exists", () => {
  const root = mkdtempSync(join(tmpdir(), "standup-legacy-"));
  const old = "apps/api/supabase/migrations/allowed_emails_signup_gate.sql";
  mkdirSync(join(root, "apps/api/supabase/migrations"), { recursive: true });
  writeFileSync(join(root, old), "select 1;\n");
  assert.throws(
    () => resolveMigrationFiles(root, [old]),
    /old apps\/api\/supabase\/migrations\/ layout[\s\S]*20260520120000_platform_allowed_emails_signup_gate\.sql/,
  );
  assert.throws(
    () => resolveMigrationFiles(root, ["apps/api/supabase/migrations/custom.sql"]),
    /feature-migrations\/ with a YYYYMMDDHHMMSS_ prefix/,
  );
});

test("every legacy path maps to a feature migration that exists", () => {
  const repo = join(import.meta.dirname, "../..");
  for (const target of Object.values(LEGACY_MIGRATION_PATHS)) {
    assert.equal(resolveMigrationFiles(repo, [target]).length, 1, target);
  }
});

test("resolveDbUrl prefers the shell, then supabase/.env.prod", () => {
  const root = mkdtempSync(join(tmpdir(), "standup-db-"));
  mkdirSync(join(root, "supabase"));
  writeFileSync(
    join(root, "supabase/.env.prod"),
    "SUPABASE_DB_URL=postgresql://postgres:file-secret@db.example.com:5432/postgres\n",
  );
  const fromFile = resolveDbUrl(root, "prod", {});
  assert.equal(fromFile.source, "supabase/.env.prod");
  assert.match(fromFile.url, /file-secret/);
  const fromShell = resolveDbUrl(root, "prod", {
    SUPABASE_DB_URL: "postgresql://postgres:shell-secret@db.example.com:5432/postgres",
  });
  assert.equal(fromShell.source, "SUPABASE_DB_URL");
  assert.match(fromShell.url, /shell-secret/);
});

test("parsePostgresConn keeps @ and ! inside the password", () => {
  const conn = parsePostgresConn(
    "postgresql://postgres.myref:p@ss!word@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
  );
  assert.equal(conn.host, "aws-0-us-east-1.pooler.supabase.com");
  assert.equal(conn.port, "5432");
  assert.equal(conn.user, "postgres.myref");
  assert.equal(conn.password, "p@ss!word");
  assert.equal(conn.database, "postgres");
});

test("redactDbUrl strips the password", () => {
  const url = "postgresql://postgres:super-secret@db.example.com:5432/postgres";
  const out = redactDbUrl(`connected ${url} as postgres:super-secret`, [url, "super-secret"]);
  assert.equal(out.includes("super-secret"), false);
  assert.equal(out.includes(url), false);
});

const quiet = () => {};
const devPlan = {
  envName: "dev",
  conn: { host: "db.example.com", user: "postgres" },
  pending: [{ rel: "supabase/migrations/feature-migrations/a.sql", status: "NEW" }],
};
const prodPlan = { ...devPlan, envName: "prod" };
const answering = (answer) => async () => answer;

test("confirmSqlApply accepts only the exact word", async () => {
  for (const answer of ["yes", "  yes\n"]) {
    assert.equal(await confirmSqlApply(devPlan, { isTTY: true, ask: answering(answer), log: quiet }), true);
  }
  for (const answer of ["y", "YES", "", "no", undefined]) {
    assert.equal(await confirmSqlApply(devPlan, { isTTY: true, ask: answering(answer), log: quiet }), false);
  }
});

test("confirmSqlApply asks for prod on prod", async () => {
  assert.equal(confirmWord("prod"), "prod");
  assert.equal(await confirmSqlApply(prodPlan, { isTTY: true, ask: answering("prod"), log: quiet }), true);
  assert.equal(await confirmSqlApply(prodPlan, { isTTY: true, ask: answering("yes"), log: quiet }), false);
});

test("confirmSqlApply with approve never asks", async () => {
  const ask = async () => {
    throw new Error("asked");
  };
  assert.equal(await confirmSqlApply(devPlan, { approve: true, isTTY: false, ask, log: quiet }), true);
});

test("confirmSqlApply refuses a non-TTY without naming the bypass flag", async () => {
  await assert.rejects(
    confirmSqlApply(devPlan, { isTTY: false, ask: answering("yes"), log: quiet }),
    (err) => {
      assert.match(err.message, /needs a person to approve it/);
      assert.equal(err.message.includes("--approve-sql"), false);
      return true;
    },
  );
});

test("planStandupMigrations warns and returns null without a DB URL", () => {
  const root = mkdtempSync(join(tmpdir(), "standup-plan-"));
  const dir = "supabase/migrations/feature-migrations";
  mkdirSync(join(root, dir), { recursive: true });
  mkdirSync(join(root, ".lattice"));
  writeFileSync(join(root, dir, "a.sql"), "select 1;\n");
  writeFileSync(join(root, ".lattice/standup.json"), JSON.stringify({ migrations: [`${dir}/a.sql`] }));
  const warnings = [];
  const spawn = () => {
    throw new Error("psql should not run");
  };
  const plan = planStandupMigrations(root, "dev", {
    log: quiet,
    warn: (msg) => warnings.push(msg),
    env: {},
    spawn,
  });
  assert.equal(plan, null);
  assert.match(warnings.join("\n"), /No usable SUPABASE_DB_URL/);
});

test("planStandupMigrations throws (does not warn-and-skip) when the database is unreachable", () => {
  const root = mkdtempSync(join(tmpdir(), "standup-unreachable-"));
  const dir = "supabase/migrations/feature-migrations";
  mkdirSync(join(root, dir), { recursive: true });
  mkdirSync(join(root, ".lattice"));
  writeFileSync(join(root, dir, "a.sql"), "select 1;\n");
  writeFileSync(join(root, ".lattice/standup.json"), JSON.stringify({ migrations: [`${dir}/a.sql`] }));
  const spawn = () => ({ status: 2, stdout: "", stderr: "could not connect to server: secret-pw" });
  assert.throws(
    () =>
      planStandupMigrations(root, "dev", {
        log: quiet,
        warn: quiet,
        env: { SUPABASE_DB_URL: "postgresql://postgres:secret-pw@db.example.com:5432/postgres" },
        spawn,
        psqlBin: "psql",
      }),
    (err) => {
      assert.match(err.message, /reachable/);
      assert.equal(err.message.includes("secret-pw"), false, "password stays redacted even on throw");
      return true;
    },
  );
});

test("planStandupMigrations skips quietly with no standup.json", () => {
  const root = mkdtempSync(join(tmpdir(), "standup-none-"));
  assert.equal(planStandupMigrations(root, "dev", { log: quiet, warn: quiet, env: {} }), null);
});
