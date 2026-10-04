#!/usr/bin/env node
/**
 * Laptop helper: read this env's SSM copy of terraform.tfvars secrets.
 * Deploy app / GitHub do not use this. Lambda already reads SSM at runtime.
 *
 *   npm run --silent ssm:env -- --env prod
 *   npm run --silent ssm:env -- --env prod --names
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { terraformDir } from "./deploy-env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const SSM_REQUIRED_SUFFIXES = ["supabase/url", "supabase/anon_key", "supabase/service_role_key"];

const SUFFIX_TO_ENV = {
  "supabase/url": "SUPABASE_URL",
  "supabase/anon_key": "SUPABASE_ANON_KEY",
  "supabase/service_role_key": "SUPABASE_SERVICE_ROLE_KEY",
  "supabase/jwt_secret": "SUPABASE_JWT_SECRET",
  "supabase/db_url": "SUPABASE_DB_URL",
};

export const HELP = `Usage:
  npm run --silent ssm:env -- --env <dev|prod>
  npm run --silent ssm:env -- --env <dev|prod> --names

Print KEY=value from /<project>-<env>/supabase/* for local curls.
--names prints parameter names only (no values).
`;

export function parseSsmEnvArgs(argv) {
  const args = argv.slice(2);
  const opts = { env: null, names: false, help: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--names") opts.names = true;
    else if (a === "--env") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        console.error("--env requires a name (dev or prod).");
        process.exit(1);
      }
      opts.env = value;
      i++;
    } else if (a.startsWith("--env=")) {
      opts.env = a.slice("--env=".length);
    } else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else {
      console.error(`Unexpected argument: ${a}`);
      process.exit(1);
    }
  }
  if (opts.help) return opts;
  if (opts.env !== "dev" && opts.env !== "prod") {
    console.error("Missing --env. Use --env dev or --env prod.");
    process.exit(1);
  }
  return opts;
}

export function ssmSuffix(name, prefix) {
  const base = String(prefix || "").replace(/\/$/, "");
  const full = String(name || "");
  if (base && full.startsWith(`${base}/`)) return full.slice(base.length + 1);
  return "";
}

export function ssmNameToEnvKey(name, prefix) {
  return SUFFIX_TO_ENV[ssmSuffix(name, prefix)] || "";
}

export function expectedSsmNames(prefix) {
  const base = String(prefix || "").replace(/\/$/, "");
  return SSM_REQUIRED_SUFFIXES.map((suffix) => `${base}/${suffix}`);
}

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: false });
  return {
    ok: !r.error && r.status === 0,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
  };
}

function tfRaw(tfDir, name) {
  const r = capture("terraform", [`-chdir=${tfDir}`, "output", "-raw", name]);
  if (!r.ok) return "";
  const v = r.stdout;
  if (!v || v === "null" || v === "None") return "";
  return v;
}

function listParameters(prefix, region, withValues) {
  const args = [
    "ssm",
    "get-parameters-by-path",
    "--path",
    prefix,
    "--recursive",
    "--output",
    "json",
  ];
  if (region) args.splice(1, 0, "--region", region);
  if (withValues) args.push("--with-decryption");
  const r = capture("aws", args);
  if (!r.ok) return { ok: false, params: [], err: r.stderr || r.stdout };
  try {
    const json = JSON.parse(r.stdout || "{}");
    return { ok: true, params: json.Parameters || [], err: "" };
  } catch {
    return { ok: false, params: [], err: "invalid aws json" };
  }
}

function main() {
  const opts = parseSsmEnvArgs(process.argv);
  if (opts.help) {
    process.stdout.write(HELP);
    return;
  }
  const tfDir = terraformDir(root, opts.env);
  const prefix = tfRaw(tfDir, "ssm_path_prefix");
  if (!prefix) {
    console.error(`No ssm_path_prefix — run standup / deploy:aws -- --env ${opts.env} first.`);
    process.exit(1);
  }
  const apiUrl = tfRaw(tfDir, "api_url");
  const regionMatch = apiUrl.match(/execute-api\.([a-z0-9-]+)\.amazonaws\.com/i);
  const region = regionMatch ? regionMatch[1] : "us-east-1";
  const listed = listParameters(prefix, region, !opts.names);
  if (!listed.ok) {
    console.error(listed.err || "ssm get-parameters-by-path failed");
    process.exit(1);
  }
  if (opts.names) {
    for (const name of expectedSsmNames(prefix)) process.stdout.write(`${name}\n`);
    return;
  }
  const bySuffix = new Map();
  for (const p of listed.params) {
    const suffix = ssmSuffix(p.Name, prefix);
    if (suffix) bySuffix.set(suffix, p.Value ?? "");
  }
  const missing = SSM_REQUIRED_SUFFIXES.filter((s) => !bySuffix.has(s));
  if (missing.length) {
    console.error(`SSM missing ${missing.join(", ")} under ${prefix}`);
    process.exit(1);
  }
  if (apiUrl) process.stdout.write(`API_URL=${apiUrl}\n`);
  for (const [suffix, key] of Object.entries(SUFFIX_TO_ENV)) {
    if (!bySuffix.has(suffix)) continue;
    process.stdout.write(`${key}=${bySuffix.get(suffix)}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
