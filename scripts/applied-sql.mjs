/**
 * Track which standup SQL files a database has already applied.
 *
 * The record lives in the target database (`lattice.applied_sql`), so every
 * laptop and CI see the same state. Rows are keyed by file basename, not path:
 * the timestamp prefix is unique, and the key survives directory moves.
 *
 * Planning is read-only. Nothing is written until the user approves, and then
 * each file runs in its own `psql --single-transaction` together with its
 * tracking row.
 *
 * `--single-transaction` rules out statements that cannot run inside a
 * transaction block (e.g. `create index concurrently`, `alter type … add
 * value` on older Postgres). A migration that needs one must say so in its
 * header and be applied by hand.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { spawnSync } from "node:child_process";

export const APPLIED_SQL_TABLE = "lattice.applied_sql";

/** `lattice`, not `public`: Supabase's Data API exposes `public` to anon / authenticated. */
export const BOOTSTRAP_SQL = `
create schema if not exists lattice;
create table if not exists lattice.applied_sql (
  name       text primary key,
  sha256     text not null,
  applied_at timestamptz not null default now()
);
do $$
declare r text;
begin
  revoke all on schema lattice from public;
  revoke all on all tables in schema lattice from public;
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema lattice from %I', r);
      execute format('revoke all on all tables in schema lattice from %I', r);
    end if;
  end loop;
end
$$;
`.trim();

const SAFE_NAME = /^[A-Za-z0-9._-]+\.sql$/;

export function sha256File(abs) {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

/**
 * Pure classification. `files` are `{ rel, abs, name, sha256 }`; `appliedRows`
 * are `{ name, sha256 }` from the database.
 */
export function classify(files, appliedRows) {
  const applied = new Map(appliedRows.map((row) => [row.name, row.sha256]));
  return files.map((file) => {
    if (!applied.has(file.name)) return { ...file, status: "NEW" };
    return { ...file, status: applied.get(file.name) === file.sha256 ? "APPLIED" : "CHANGED" };
  });
}

export function parseAppliedRows(stdout) {
  return String(stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, sha256] = line.split("\t");
      return { name, sha256 };
    });
}

export function upsertSql(name, sha256) {
  // Values are inlined because psql does not interpolate variables in -c.
  if (!SAFE_NAME.test(name)) throw new Error(`Refusing to track SQL file with unusual name: ${name}`);
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error(`Bad sha256 for ${name}`);
  return (
    `insert into lattice.applied_sql (name, sha256) values ('${name}', '${sha256}') ` +
    `on conflict (name) do update set sha256 = excluded.sha256, applied_at = now();`
  );
}

function connArgs(conn) {
  return ["-h", conn.host, "-p", conn.port, "-U", conn.user, "-d", conn.database];
}

/** Run psql with the password in the environment, never in argv. */
export function runPsql({ psql, conn, args, cwd, spawn = spawnSync }) {
  return spawn(psql, [...connArgs(conn), "-v", "ON_ERROR_STOP=1", ...args], {
    cwd,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PGPASSWORD: conn.password, PGSSLMODE: "require" },
  });
}

function failed(r) {
  return Boolean(r.error) || r.status !== 0;
}

function output(r) {
  return `${r.stdout || ""}\n${r.stderr || ""}${r.error ? `\n${r.error.message}` : ""}`;
}

/**
 * Read `lattice.applied_sql` (read-only) and classify `files`.
 * Throws on a psql failure; the message is redacted with `redact`.
 */
export function planAppliedSql({ files, psql, conn, cwd, spawn = spawnSync, redact = (s) => s }) {
  const withHash = files.map((file) => ({
    ...file,
    name: basename(file.rel),
    sha256: sha256File(file.abs),
  }));
  const exists = runPsql({
    psql,
    conn,
    cwd,
    spawn,
    args: ["-At", "-c", `select to_regclass('${APPLIED_SQL_TABLE}') is not null`],
  });
  if (failed(exists)) {
    throw new Error(redact(output(exists)).trim() || "psql could not read lattice.applied_sql");
  }
  let rows = [];
  if (String(exists.stdout).trim() === "t") {
    const r = runPsql({
      psql,
      conn,
      cwd,
      spawn,
      args: ["-At", "-F", "\t", "-c", `select name, sha256 from ${APPLIED_SQL_TABLE}`],
    });
    if (failed(r)) {
      throw new Error(redact(output(r)).trim() || "psql could not read lattice.applied_sql");
    }
    rows = parseAppliedRows(r.stdout);
  }
  const classified = classify(withHash, rows);
  return {
    pending: classified.filter((file) => file.status !== "APPLIED"),
    appliedCount: classified.filter((file) => file.status === "APPLIED").length,
  };
}

/**
 * Apply approved files. Each file is hashed again first; a mismatch with the
 * approved hash stops before psql runs. Throws on any failure.
 */
export function applyPendingSql({
  pending,
  psql,
  conn,
  cwd,
  envName,
  spawn = spawnSync,
  redact = (s) => s,
  log = console.log,
}) {
  for (const file of pending) {
    if (sha256File(file.abs) !== file.sha256) {
      throw new Error(`${file.rel} changed after you approved it; re-run deploy.`);
    }
    log(`→ psql -h ${conn.host} -f ${file.rel} (${envName}, ${file.status})`);
    const r = runPsql({
      psql,
      conn,
      cwd,
      spawn,
      args: [
        "--single-transaction",
        "-c",
        BOOTSTRAP_SQL,
        "-f",
        file.abs,
        "-c",
        upsertSql(file.name, file.sha256),
      ],
    });
    if (failed(r)) {
      throw new Error(redact(output(r)).trim() || `psql failed on ${file.rel}`);
    }
  }
}
