/**
 * Plan, confirm and apply the SQL files listed in `.lattice/standup.json`.
 * `deploy:aws` plans and asks before terraform apply, then applies after it.
 *
 *   { "migrations": { "dev": ["supabase/migrations/feature-migrations/foo.sql"], "prod": ["…"] } }
 *   { "migrations": ["supabase/migrations/feature-migrations/foo.sql"] }
 *
 * Connection: `SUPABASE_DB_URL` in the shell, else `supabase/.env.<env>`
 * (prod is only `.env.prod`; dev is `.env.dev` then `.env.local` then `.env`).
 * Laptop-only — gitignored. Never print the URL or password.
 *
 * Only files that are NEW or CHANGED for that database (see `lattice.applied_sql`
 * in ./applied-sql.mjs) are listed, and only a person typing the confirm word
 * applies them. Empty / missing config is a no-op. `--plan-only` and
 * `--bootstrap-only` never reach this (callers skip).
 */
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { applyPendingSql, planAppliedSql } from "./applied-sql.mjs";
import { envFileLabel, readEnvFile, resolveEnvFile } from "./env-files.mjs";
import { syncFeatureMigrations } from "./sync-feature-migrations.mjs";

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

/**
 * Pre-relayout paths a spawn's preserved `.lattice/standup.json` may still list.
 * Applying them would re-run the old allowlist SQL (unconditional auth.users
 * backfill) under a filename lattice.applied_sql has never seen.
 */
const LEGACY_MIGRATION_DIR = "apps/api/supabase/migrations/";
export const LEGACY_MIGRATION_PATHS = {
  "apps/api/supabase/migrations/allowed_emails_signup_gate.sql":
    "supabase/migrations/feature-migrations/20260520120000_platform_allowed_emails_signup_gate.sql",
  "apps/api/supabase/migrations/things.sql":
    "supabase/migrations/feature-migrations/20260520120100_app_things.sql",
};

function legacyPathError(rel) {
  const replacement = LEGACY_MIGRATION_PATHS[rel];
  const fix = replacement
    ? `Replace it with ${replacement}.`
    : `Move it to supabase/migrations/feature-migrations/ with a YYYYMMDDHHMMSS_ prefix and list that path.`;
  return new Error(
    `${STANDUP_CONFIG_NAME} lists ${rel}, which is from the old ${LEGACY_MIGRATION_DIR} layout.\n` +
      `${fix}\n` +
      `See docs/playbooks/supabase-migrations.md#migrating-a-spawn-from-appsapisupabase.`,
  );
}

export function resolveMigrationFiles(root, relPaths) {
  const files = [];
  for (const rel of relPaths) {
    if (rel.replace(/\\/g, "/").startsWith(LEGACY_MIGRATION_DIR)) throw legacyPathError(rel);
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

export function redactDbUrl(text, secrets = []) {
  if (!text) return "";
  let out = String(text);
  for (const secret of secrets.filter(Boolean)) {
    out = out.split(secret).join("***");
  }
  return out.replace(/postgresql:\/\/[^:\s]+:[^@\s]+@/g, "postgresql://***:***@");
}

/**
 * Parse a Postgres URI. Uses the last `@` as the host separator so an
 * unencoded `@` or `!` in the password is not treated as the hostname.
 */
export function parsePostgresConn(url) {
  const trimmed = typeof url === "string" ? url.trim() : "";
  const m = trimmed.match(/^(postgres(?:ql)?):\/\/(.+)$/i);
  if (!m) return null;
  const rest = m[2];
  const at = rest.lastIndexOf("@");
  if (at <= 0) return null;
  const userinfo = rest.slice(0, at);
  let hostpart = rest.slice(at + 1);
  if (!hostpart || hostpart.includes("@")) return null;
  let database = "postgres";
  const slash = hostpart.indexOf("/");
  if (slash !== -1) {
    const after = hostpart.slice(slash + 1);
    hostpart = hostpart.slice(0, slash);
    const q = after.indexOf("?");
    const dbRaw = q === -1 ? after : after.slice(0, q);
    if (dbRaw) database = decodeURIComponent(dbRaw);
  }
  let host = hostpart;
  let port = "5432";
  const colon = hostpart.lastIndexOf(":");
  if (colon !== -1 && /^\d+$/.test(hostpart.slice(colon + 1))) {
    host = hostpart.slice(0, colon);
    port = hostpart.slice(colon + 1);
  }
  if (!host || host.startsWith("!")) return null;
  const userColon = userinfo.indexOf(":");
  let user = userinfo;
  let password = "";
  if (userColon === -1) {
    user = decodeURIComponent(userinfo);
  } else {
    user = decodeURIComponent(userinfo.slice(0, userColon));
    try {
      password = decodeURIComponent(userinfo.slice(userColon + 1));
    } catch {
      password = userinfo.slice(userColon + 1);
    }
  }
  if (!user) return null;
  return { host, port, user, password, database };
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

export function resolvePsqlBin() {
  const candidates = [
    process.env.PSQL?.trim(),
    "psql",
    "/opt/homebrew/opt/libpq/bin/psql",
    "/usr/local/opt/libpq/bin/psql",
  ].filter(Boolean);
  for (const bin of candidates) {
    if (bin !== "psql" && !existsSync(bin)) continue;
    const r = spawnSync(bin, ["--version"], { encoding: "utf8", shell: false });
    if (!r.error && r.status === 0) return bin;
  }
  return "";
}

function dbUrlHelp(envName) {
  return (
    `Add SUPABASE_DB_URL to ${envFileLabel("supabase", envName)} (copy supabase/.env.example).\n` +
    `If the password has @ or !, URL-encode them (%40 / %21) or keep the raw password — standup uses the last @ as the host.\n` +
    `Use the session pooler or direct host on port 5432, not the transaction pooler (6543).`
  );
}

const PSQL_HELP =
  "On macOS: brew install libpq && export PATH=\"/opt/homebrew/opt/libpq/bin:$PATH\"";

/** One TTY check, shared with deploy-aws's terraform gate. */
export function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/** The word a person must type. Flip here to change the prod rule. */
export function confirmWord(envName) {
  return envName === "prod" ? "prod" : "yes";
}

function readStandupList(root, envName, log) {
  const file = standupConfigPath(root);
  if (!existsSync(file)) {
    log("→ skip standup migrations (no .lattice/standup.json)");
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error(`${STANDUP_CONFIG_NAME} is not valid JSON.`);
  }
  const relPaths = parseStandupMigrations(parsed, envName);
  if (relPaths.length === 0) {
    log(`→ skip standup migrations (none listed for ${envName})`);
    return null;
  }
  return resolveMigrationFiles(root, relPaths);
}

/**
 * Read-only plan of the SQL that would run for `envName`.
 *
 * Returns `null` for every skip case (no config, empty list, no DB URL, no
 * psql binary). Missing connection details are warnings so terraform is
 * never blocked by them. Throws on a broken config or an unreachable /
 * unqueryable database — a connection you have but can't use is treated as
 * a real failure, not a skip, so the deploy stops before terraform.
 */
export function planStandupMigrations(
  root,
  envName,
  { log = console.log, warn = console.warn, env = process.env, spawn = spawnSync, psqlBin } = {},
) {
  const files = readStandupList(root, envName, log);
  if (!files) return null;

  const { url: dbUrl, source } = resolveDbUrl(root, envName, env);
  const conn = parsePostgresConn(dbUrl);
  if (!conn) {
    warn(
      `\nWarning: skipping Supabase SQL for ${envName}. No usable SUPABASE_DB_URL.\n${dbUrlHelp(envName)}\n`,
    );
    return null;
  }
  const psql = psqlBin ?? resolvePsqlBin();
  if (!psql) {
    warn(
      `\nWarning: skipping Supabase SQL for ${envName}. psql is required to apply standup migrations.\n${PSQL_HELP}\n`,
    );
    return null;
  }
  if (source && source !== "SUPABASE_DB_URL") log(`→ standup migrations: ${source}`);

  const secrets = [dbUrl, conn.password];
  const redact = (text) => redactDbUrl(text, secrets);
  let result;
  try {
    result = planAppliedSql({ files, psql, conn, cwd: root, spawn, redact });
  } catch (err) {
    // Decision: an unreachable (or unqueryable) database stops the deploy
    // before terraform. Unlike a missing URL, you have a connection target
    // here and it isn't working — that's worth failing loudly for.
    throw new Error(
      `Supabase SQL for ${envName}: could not read lattice.applied_sql (is the database reachable?):\n` +
        `${redact(err instanceof Error ? err.message : String(err))}`,
    );
  }
  for (const file of result.pending) {
    if (file.status === "CHANGED") {
      warn(
        `\n!! ${file.rel} was already applied to ${envName} with different contents.\n` +
          `!! Applied feature migrations should not be edited. Add a new migration instead.\n`,
      );
    }
  }
  if (result.pending.length === 0) {
    log(`→ Supabase SQL up to date for ${envName} (${result.appliedCount} already applied)`);
  }
  return {
    envName,
    conn,
    dbUrl,
    source,
    psql,
    pending: result.pending,
    appliedCount: result.appliedCount,
  };
}

async function askLine(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

/**
 * Terraform-style confirm. Resolves true only when the person types the exact
 * confirm word (case-sensitive). `approve` comes from a flag a person passes.
 */
export async function confirmSqlApply(
  plan,
  { approve = false, isTTY = isInteractive(), ask = askLine, log = console.log } = {},
) {
  if (approve) return true;
  if (!isTTY) {
    // Do not name the non-interactive flag here: agents read this message.
    throw new Error(
      `Supabase SQL for ${plan.envName} needs a person to approve it. Run this command yourself in a terminal.`,
    );
  }
  const word = confirmWord(plan.envName);
  log(`\nSupabase SQL to apply (${plan.envName}):`);
  log(`  host: ${plan.conn.host}`);
  log(`  user: ${plan.conn.user}`);
  for (const file of plan.pending) log(`  ${file.status.padEnd(7)} ${file.rel}`);
  log(`\nDo you want to apply this SQL?\n  Only '${word}' will be accepted to approve.\n`);
  const answer = await ask("  Enter a value: ");
  return String(answer ?? "").trim() === word;
}

/** Apply an approved plan. Throws on failure; nothing secret is printed. */
export function applyStandupMigrations(root, plan, { log = console.log, spawn = spawnSync } = {}) {
  syncFeatureMigrations(root, { warn: log });
  const secrets = [plan.dbUrl, plan.conn.password];
  applyPendingSql({
    pending: plan.pending,
    psql: plan.psql,
    conn: plan.conn,
    cwd: root,
    envName: plan.envName,
    spawn,
    redact: (text) => redactDbUrl(text, secrets),
    log,
  });
  log(`→ standup migrations: ${plan.pending.length} file(s) applied (${plan.envName})`);
}
