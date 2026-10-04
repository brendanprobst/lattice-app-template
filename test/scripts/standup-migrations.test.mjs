import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  parseStandupMigrations,
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
  mkdirSync(join(root, "apps/api/supabase/migrations"), { recursive: true });
  writeFileSync(join(root, "apps/api/supabase/migrations/ok.sql"), "select 1;\n");
  const ok = resolveMigrationFiles(root, ["apps/api/supabase/migrations/ok.sql"]);
  assert.equal(ok.length, 1);
  assert.throws(() => resolveMigrationFiles(root, ["../outside.sql"]), /repo-relative/);
  assert.throws(() => resolveMigrationFiles(root, ["apps/api/supabase/migrations/missing.sql"]), /missing/);
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

test("redactDbUrl strips the password", () => {
  const url = "postgresql://postgres:super-secret@db.example.com:5432/postgres";
  const out = redactDbUrl(`connected ${url} as postgres:super-secret`, url);
  assert.equal(out.includes("super-secret"), false);
  assert.equal(out.includes(url), false);
});
