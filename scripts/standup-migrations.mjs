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

function requirePsql() {
  const bin = resolvePsqlBin();
  if (bin) return bin;
  console.error(
    "psql is required to apply standup migrations.\n" +
      "On macOS: brew install libpq && export PATH=\"/opt/homebrew/opt/libpq/bin:$PATH\"",
  );
  process.exit(1);
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
  const conn = parsePostgresConn(dbUrl);
  if (!conn) {
    console.error(
      `Standup migrations for ${envName} need a usable SUPABASE_DB_URL.\n` +
        `Add it to ${envFileLabel("supabase", envName)} (copy supabase/.env.example).\n` +
        `If the password has @ or !, URL-encode them (%40 / %21) or keep the raw password — standup uses the last @ as the host.\n` +
        `Use the session pooler or direct host on port 5432, not the transaction pooler (6543).`,
    );
    process.exit(1);
  }
  if (source && source !== "SUPABASE_DB_URL") {
    console.log(`→ standup migrations: ${source}`);
  }
  const psql = requirePsql();
  const secrets = [dbUrl, conn.password];
  for (const { rel, abs } of files) {
    console.log(`→ psql -h ${conn.host} -f ${rel} (${envName})`);
    const r = spawnSync(
      psql,
      [
        "-h",
        conn.host,
        "-p",
        conn.port,
        "-U",
        conn.user,
        "-d",
        conn.database,
        "-v",
        "ON_ERROR_STOP=1",
        "-f",
        abs,
      ],
      {
        cwd: root,
        encoding: "utf8",
        shell: false,
        env: {
          ...process.env,
          PGPASSWORD: conn.password,
          PGSSLMODE: "require",
        },
      },
    );
    const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
    if (r.error || r.status !== 0) {
      console.error(redactDbUrl(combined, secrets).trim() || `psql failed on ${rel}`);
      process.exit(r.status ?? 1);
    }
  }
  console.log(`→ standup migrations: ${files.length} file(s) applied (${envName})`);
}
