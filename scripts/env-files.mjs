/**
 * Env-file lookup shared by deploy and Supabase scripts.
 *
 * Dev (the default) uses the first file that exists:
 *   .env.dev, .env.local, .env
 * Any other name, including prod, uses only `.env.<name>` in that directory.
 * A prod command never falls back to a dev file.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ENV_NAME = /^[a-z][a-z0-9-]*$/;
const DEV_FILES = [".env.dev", ".env.local", ".env"];

export function takeEnvArg(argv) {
  const rest = [];
  let env = "dev";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--env") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        console.error("--env requires a name (for example: --env prod)");
        process.exit(1);
      }
      env = value;
      i++;
      continue;
    }
    if (arg.startsWith("--env=")) {
      env = arg.slice("--env=".length);
      continue;
    }
    rest.push(arg);
  }
  if (!ENV_NAME.test(env)) {
    console.error(`Invalid --env ${JSON.stringify(env)}. Use a short name like dev or prod.`);
    process.exit(1);
  }
  return { env, argv: rest };
}

export function readEnvFile(full) {
  const values = {};
  for (const line of readFileSync(full, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    values[key] = val;
  }
  return values;
}

/** Absolute path of the file this env should read, or null when none exists. */
export function resolveEnvFile(dir, env) {
  const names = env === "dev" ? DEV_FILES : [`.env.${env}`];
  for (const name of names) {
    const full = join(dir, name);
    if (existsSync(full)) return full;
  }
  return null;
}

export function envFileLabel(dir, env) {
  if (env === "dev") return `${dir}/{.env.dev,.env.local,.env}`;
  return `${dir}/.env.${env}`;
}

/**
 * Copy a file into process.env.
 * `override` replaces keys already set in the shell. Prod loads use that so a
 * dev export cannot win. Dev loads leave an explicit shell value in place.
 */
export function applyEnvFile(full, { override }) {
  const values = readEnvFile(full);
  for (const [key, val] of Object.entries(values)) {
    if (override || process.env[key] === undefined) process.env[key] = val;
  }
  return values;
}
