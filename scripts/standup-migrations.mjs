/**
 * Apply SQL files listed in `.lattice/standup.json` after terraform apply.
 *
 *   { "migrations": { "dev": ["apps/api/supabase/migrations/foo.sql"], "prod": ["…"] } }
 *   { "migrations": ["apps/api/supabase/migrations/foo.sql"] }
 *
 * Connection: `SUPABASE_DB_URL` in the shell, else `supabase/.env.<env>`
 * (prod is only `.env.prod`; dev is `.env.dev` then `.env.local` then `.env`).
 * Laptop-only — gitignored. Never print the URL or password.
 *
 * Empty / missing config is a no-op. `--plan-only` and `--bootstrap-only`
 * never reach this (callers skip).
 */
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { envFileLabel, readEnvFile, resolveEnvFile } from "./env-files.mjs";

export const STANDUP_CONFIG_NAME = ".lattice/standup.json";

export function standupConfigPath(root) {
  return join(root, STANDUP_CONFIG_NAME);
}

export function parseStandupMigrations(json, envName) {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error(`${STANDUP_CONFIG_NAME} must be a JSON object.`);
  }
  const raw = json.migrations;
  if (raw == null) return [];
  let list;
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object") {
    const forEnv = raw[envName];
    if (forEnv == null) return [];
    if (!Array.isArray(forEnv)) {
      throw new Error(`${STANDUP_CONFIG_NAME} migrations.${envName} must be an array of file paths.`);
    }
    list = forEnv;
  } else {
    throw new Error(`${STANDUP_CONFIG_NAME} "migrations" must be an array or { dev: [], prod: [] }.`);
  }
  return list.map((item, i) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new Error(`${STANDUP_CONFIG_NAME} migrations[${i}] must be a non-empty path.`);
    }
    return item.trim();
  });
}

export function resolveMigrationFiles(root, relPaths) {
  const files = [];
  for (const rel of relPaths) {
    if (isAbsolute(rel) || rel.split(/[\\/]/).includes("..")) {
      throw new Error(`Refusing migration path ${rel}. Use a repo-relative path.`);
    }
    const abs = resolve(root, rel);
    const relToRoot = relative(root, abs);
    if (relToRoot.startsWith(`..${sep}`) || relToRoot === "..") {
      throw new Error(`Refusing migration path ${rel} (escapes the repo).`);
    }
    if (!existsSync(abs)) {
      throw new Error(`Migration file missing: ${rel}`);
    }
    files.push({ rel, abs });
  }
  return files;
}

export function redactDbUrl(text, dbUrl) {
  if (!text) return "";
  let out = String(text);
  if (dbUrl) out = out.split(dbUrl).join("[SUPABASE_DB_URL]");
  try {
    const pw = dbUrl ? decodeURIComponent(new URL(dbUrl).password || "") : "";
    if (pw) out = out.split(pw).join("***");
  } catch {
    /* ignore */
  }
  return out.replace(/postgresql:\/\/[^:\s]+:[^@\s]+@/g, "postgresql://***:***@");
}

function isDirectPostgresUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "postgresql:" || u.protocol === "postgres:";
  } catch {
    return false;
  }
}

export function supabaseEnvDir(root) {
  return join(root, "supabase");
}

export function resolveDbUrl(root, envName, env = process.env) {
  const fromEnv = typeof env.SUPABASE_DB_URL === "string" ? env.SUPABASE_DB_URL.trim() : "";
  if (fromEnv) return { url: fromEnv, source: "SUPABASE_DB_URL" };
  const full = resolveEnvFile(supabaseEnvDir(root), envName);
  if (!full) return { url: "", source: "" };
  const values = readEnvFile(full);
  const url = typeof values.SUPABASE_DB_URL === "string" ? values.SUPABASE_DB_URL.trim() : "";
  return { url, source: relative(root, full) };
}

function requirePsql() {
  const r = spawnSync("psql", ["--version"], { encoding: "utf8", shell: false });
  if (r.error || r.status !== 0) {
    console.error("psql is required to apply standup migrations. Install the PostgreSQL client.");
    process.exit(1);
  }
}

export function applyStandupMigrations(root, envName) {
  const file = standupConfigPath(root);
  if (!existsSync(file)) {
    console.log("→ skip standup migrations (no .lattice/standup.json)");
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    console.error(`${STANDUP_CONFIG_NAME} is not valid JSON.`);
    process.exit(1);
  }
  let relPaths;
  try {
    relPaths = parseStandupMigrations(parsed, envName);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  if (relPaths.length === 0) {
    console.log(`→ skip standup migrations (none listed for ${envName})`);
    return;
  }
  let files;
  try {
    files = resolveMigrationFiles(root, relPaths);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  const { url: dbUrl, source } = resolveDbUrl(root, envName);
  if (!dbUrl || !isDirectPostgresUrl(dbUrl)) {
    console.error(
      `Standup migrations for ${envName} need SUPABASE_DB_URL.\n` +
        `Add it to ${envFileLabel("supabase", envName)} (copy supabase/.env.example).\n` +
        `Use the session pooler or direct host on port 5432, not the transaction pooler (6543).`,
    );
    process.exit(1);
  }
  if (source && source !== "SUPABASE_DB_URL") {
    console.log(`→ standup migrations: ${source}`);
  }
  requirePsql();
  for (const { rel, abs } of files) {
    console.log(`→ psql -f ${rel} (${envName})`);
    const r = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", abs], {
      cwd: root,
      encoding: "utf8",
      shell: false,
    });
    const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
    if (r.error || r.status !== 0) {
      console.error(redactDbUrl(combined, dbUrl).trim() || `psql failed on ${rel}`);
      process.exit(r.status ?? 1);
    }
  }
  console.log(`→ standup migrations: ${files.length} file(s) applied (${envName})`);
}
