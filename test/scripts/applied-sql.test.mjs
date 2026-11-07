import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  applyPendingSql,
  classify,
  parseAppliedRows,
  planAppliedSql,
  sha256File,
  upsertSql,
} from "../../scripts/applied-sql.mjs";

const conn = { host: "db.example.com", port: "5432", user: "postgres", password: "pw", database: "postgres" };
const quiet = () => {};

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "applied-sql-"));
  const dir = join(root, "supabase/migrations/feature-migrations");
  mkdirSync(dir, { recursive: true });
  const abs = join(dir, "20260101000000_app_a.sql");
  writeFileSync(abs, "select 1;\n");
  return { root, abs, rel: "supabase/migrations/feature-migrations/20260101000000_app_a.sql" };
}

test("classify marks NEW, CHANGED and APPLIED by basename", () => {
  const files = [
    { name: "a.sql", sha256: "1" },
    { name: "b.sql", sha256: "2" },
    { name: "c.sql", sha256: "3" },
  ];
  const out = classify(files, [
    { name: "b.sql", sha256: "old" },
    { name: "c.sql", sha256: "3" },
  ]);
  assert.deepEqual(
    out.map((f) => f.status),
    ["NEW", "CHANGED", "APPLIED"],
  );
});

test("parseAppliedRows reads tab-separated psql output", () => {
  assert.deepEqual(parseAppliedRows("a.sql\tabc\nb.sql\tdef\n\n"), [
    { name: "a.sql", sha256: "abc" },
    { name: "b.sql", sha256: "def" },
  ]);
});

test("upsertSql refuses names that could break the literal", () => {
  const sha = "a".repeat(64);
  assert.match(upsertSql("20260101000000_app_a.sql", sha), /on conflict \(name\)/);
  assert.throws(() => upsertSql("x');drop table y;--.sql", sha), /unusual name/);
  assert.throws(() => upsertSql("a.sql", "nothex"), /Bad sha256/);
});

test("planAppliedSql treats every file as NEW before the table exists", () => {
  const { root, abs, rel } = fixture();
  const calls = [];
  const spawn = (_bin, args) => {
    calls.push(args.join(" "));
    return { status: 0, stdout: "f\n", stderr: "" };
  };
  const plan = planAppliedSql({ files: [{ rel, abs }], psql: "psql", conn, cwd: root, spawn });
  assert.equal(plan.pending.length, 1);
  assert.equal(plan.pending[0].status, "NEW");
  assert.equal(calls.length, 1, "does not query a table that does not exist");
  assert.equal(calls.some((c) => /insert|create/i.test(c)), false, "planning is read-only");
});

test("planAppliedSql skips files whose hash matches", () => {
  const { root, abs, rel } = fixture();
  const sha = sha256File(abs);
  const spawn = (_bin, args) =>
    args.join(" ").includes("to_regclass")
      ? { status: 0, stdout: "t\n" }
      : { status: 0, stdout: `20260101000000_app_a.sql\t${sha}\n` };
  const plan = planAppliedSql({ files: [{ rel, abs }], psql: "psql", conn, cwd: root, spawn });
  assert.equal(plan.pending.length, 0);
  assert.equal(plan.appliedCount, 1);
});

test("planAppliedSql redacts psql errors", () => {
  const { root, abs, rel } = fixture();
  const spawn = () => ({ status: 2, stdout: "", stderr: "password pw rejected" });
  assert.throws(
    () =>
      planAppliedSql({
        files: [{ rel, abs }],
        psql: "psql",
        conn,
        cwd: root,
        spawn,
        redact: (s) => s.split("pw").join("***"),
      }),
    (err) => !err.message.includes(" pw ") && /\*\*\*/.test(err.message),
  );
});

test("applyPendingSql stops before psql when a file changed after approval", () => {
  const { root, abs, rel } = fixture();
  const pending = [{ rel, abs, name: "20260101000000_app_a.sql", sha256: sha256File(abs), status: "NEW" }];
  writeFileSync(abs, "select 2;\n");
  let spawned = false;
  const spawn = () => {
    spawned = true;
    return { status: 0 };
  };
  assert.throws(
    () => applyPendingSql({ pending, psql: "psql", conn, cwd: root, envName: "dev", spawn, log: quiet }),
    /changed after you approved it/,
  );
  assert.equal(spawned, false);
});

test("applyPendingSql runs bootstrap, file and tracking row in one transaction", () => {
  const { root, abs, rel } = fixture();
  const sha = sha256File(abs);
  const pending = [{ rel, abs, name: "20260101000000_app_a.sql", sha256: sha, status: "NEW" }];
  const seen = [];
  const spawn = (_bin, args, opts) => {
    seen.push({ args, env: opts.env });
    return { status: 0, stdout: "", stderr: "" };
  };
  applyPendingSql({ pending, psql: "psql", conn, cwd: root, envName: "dev", spawn, log: quiet });
  assert.equal(seen.length, 1);
  const { args, env } = seen[0];
  assert.ok(args.includes("--single-transaction"));
  assert.ok(args.includes("ON_ERROR_STOP=1"));
  const f = args.indexOf("-f");
  assert.equal(args[f + 1], abs);
  assert.match(args[f - 1], /create table if not exists lattice\.applied_sql/);
  assert.match(args[f + 3], new RegExp(sha));
  assert.equal(args.includes("pw"), false, "password stays out of argv");
  assert.equal(env.PGPASSWORD, "pw");
});
