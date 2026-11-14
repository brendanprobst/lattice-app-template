import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildMasterBody, checkMaster, listLatest, writeMaster } from "../../scripts/build-master-migration.mjs";
import { listSeedFeatures } from "../../scripts/supabase-master-seed.mjs";
import { syncFeatureMigrations } from "../../scripts/sync-feature-migrations.mjs";

const root = join(import.meta.dirname, "../..");

test("feature migrations are what the CLI directory links to", () => {
  for (const name of [
    "20260520120000_platform_allowed_emails_signup_gate.sql",
    "20260520120100_app_things.sql",
  ]) {
    const link = join(root, "supabase/migrations", name);
    assert.equal(lstatSync(link).isSymbolicLink(), true);
    assert.equal(readlinkSync(link), join("feature-migrations", name));
    assert.equal(
      readFileSync(link, "utf8"),
      readFileSync(join(root, "supabase/migrations/feature-migrations", name), "utf8"),
    );
  }
  const schema = readFileSync(join(root, "supabase/migrations/20260520120100_app_things.sql"), "utf8");
  assert.equal(schema.includes("insert into"), false);
  assert.match(schema, /create table if not exists public\.things/i);
});

test("there is exactly one LATEST and it matches the generator", () => {
  const latest = listLatest(root);
  assert.equal(latest.length, 1);
  const text = readFileSync(join(root, "supabase/migrations/master-migration", latest[0]), "utf8");
  assert.equal(text.slice(text.indexOf("\n") + 1), buildMasterBody(root));
  assert.equal(checkMaster(root).ok, true);
  assert.equal(text.includes("supabase/feature-migrations"), false);
});

test("LATEST creates the things table and the allowlist", () => {
  const [name] = listLatest(root);
  const latest = readFileSync(join(root, "supabase/migrations/master-migration", name), "utf8");
  assert.match(latest, /create table if not exists public\.things/i);
  assert.match(latest, /create table if not exists public\.allowed_emails/i);
  assert.equal(latest.includes("Demo lamp"), false);
});

test("thing demo rows live in the feature seed", () => {
  const names = listSeedFeatures(root).map((feature) => feature.name);
  assert.ok(names.includes("things"));
  const seed = readFileSync(join(root, "supabase/migrations/seed/features/things.sql"), "utf8");
  assert.match(seed, /Demo lamp/);
});

test("allowlist backfill runs only once and only on an empty list", () => {
  const sql = readFileSync(
    join(root, "supabase/migrations/feature-migrations/20260520120000_platform_allowed_emails_signup_gate.sql"),
    "utf8",
  );
  assert.match(sql, /add column if not exists backfilled_at/i);
  const guard = sql.search(/backfilled_at is null/i);
  const emptyCheck = sql.search(/not exists \(select 1 from public\.allowed_emails\)/i);
  const insert = sql.search(/^\s*from auth\.users$/im);
  assert.ok(guard !== -1 && emptyCheck !== -1 && insert !== -1);
  assert.ok(guard < insert, "backfilled_at guard comes before the auth.users insert");
  assert.ok(emptyCheck < insert, "empty-list check comes before the auth.users insert");
});

test("supabase:master --write archives a stale LATEST and is a no-op when current", () => {
  const tmp = mkdtempSync(join(tmpdir(), "master-mig-"));
  const features = join(tmp, "supabase/migrations/feature-migrations");
  const master = join(tmp, "supabase/migrations/master-migration");
  mkdirSync(features, { recursive: true });
  mkdirSync(master, { recursive: true });
  writeFileSync(join(features, "20260101000000_app_a.sql"), "create table a (id int);\n");
  writeFileSync(join(master, "LATEST_20250101.sql"), "-- old\nstale\n");
  assert.equal(checkMaster(tmp).ok, false);

  assert.equal(writeMaster(tmp, "20260102"), "supabase/migrations/master-migration/LATEST_20260102.sql");
  assert.deepEqual(listLatest(tmp), ["LATEST_20260102.sql"]);
  assert.equal(existsSync(join(master, "archive/LATEST_20250101.sql")), true);
  assert.equal(checkMaster(tmp).ok, true);

  assert.equal(writeMaster(tmp, "20260103"), null, "unchanged SQL keeps the existing LATEST");
  assert.deepEqual(readdirSync(join(master, "archive")), ["LATEST_20250101.sql"]);
});

test("syncFeatureMigrations links, prunes stale links and leaves real files alone", () => {
  const tmp = mkdtempSync(join(tmpdir(), "sync-mig-"));
  const cli = join(tmp, "supabase/migrations");
  mkdirSync(join(cli, "feature-migrations"), { recursive: true });
  writeFileSync(join(cli, "feature-migrations/20260101000000_app_a.sql"), "select 1;\n");
  writeFileSync(join(cli, "feature-migrations/20260101000100_app_b.sql"), "select 2;\n");
  symlinkSync("feature-migrations/20250101000000_app_gone.sql", join(cli, "20250101000000_app_gone.sql"));
  writeFileSync(join(cli, "20260101000100_app_b.sql"), "-- hand-written\n");

  const warnings = [];
  syncFeatureMigrations(tmp, { warn: (msg) => warnings.push(msg) });

  assert.equal(readlinkSync(join(cli, "20260101000000_app_a.sql")), join("feature-migrations", "20260101000000_app_a.sql"));
  assert.throws(() => lstatSync(join(cli, "20250101000000_app_gone.sql")), /ENOENT/);
  assert.equal(lstatSync(join(cli, "20260101000100_app_b.sql")).isSymbolicLink(), false);
  assert.equal(readFileSync(join(cli, "20260101000100_app_b.sql"), "utf8"), "-- hand-written\n");
  assert.match(warnings.join("\n"), /20260101000100_app_b\.sql is a real file/);
});

test("committed Claude settings deny every remote SQL bypass", () => {
  const settings = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8"));
  const deny = settings.permissions?.deny ?? [];
  assert.ok(deny.some((rule) => rule.includes("--approve-sql")));
  assert.ok(deny.some((rule) => /^Bash\(psql/.test(rule)));
  assert.ok(deny.some((rule) => rule.includes("supabase db push")));
  assert.ok(deny.some((rule) => rule.includes("api.supabase.com")));
});

test("committed Claude settings deny agent access to every secret-bearing env file", () => {
  const settings = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8"));
  const deny = settings.permissions?.deny ?? [];

  for (const base of ["supabase", "apps/api"]) {
    assert.ok(deny.includes(`Read(./${base}/.env)`), `missing Read deny for ${base}/.env`);
    for (const suffix of ["local", "dev", "prod"]) {
      assert.ok(deny.includes(`Read(./${base}/.env.${suffix})`), `missing Read deny for ${base}/.env.${suffix}`);
      assert.ok(
        deny.includes(`Bash(*${base}/.env.${suffix}*)`),
        `missing Bash deny for ${base}/.env.${suffix}`,
      );
    }
  }

  // .env.example must stay readable: no deny rule may match it.
  const exampleTarget = "apps/api/.env.example";
  for (const rule of deny) {
    const glob = rule.replace(/^(Read|Bash)\((.*)\)$/, "$2");
    const pattern = new RegExp(`^${glob.split("*").map((s) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
    assert.equal(pattern.test(exampleTarget), false, `${rule} would also block ${exampleTarget}`);
  }

  const denyRead = settings.sandbox?.filesystem?.denyRead ?? [];
  for (const base of ["apps/api"]) {
    for (const suffix of ["", ".local", ".dev", ".prod"]) {
      assert.ok(
        denyRead.includes(`./${base}/.env${suffix}`),
        `missing sandbox.filesystem.denyRead for ${base}/.env${suffix}`,
      );
    }
  }
});
