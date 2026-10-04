#!/usr/bin/env node
/**
 * Super health check for a laptop env after standup / terraform, before or
 * after GitHub Deploy app. Never prints secret values.
 *
 *   npm run deploy:check -- --env prod
 *   npm run deploy:check -- --env dev
 *
 * Fail = infra or config is wrong. Warn = expected gap at this step
 * (empty S3, missing Infisical supabase keys, site not uploaded yet).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { envFileLabel, readEnvFile, resolveEnvFile } from "./env-files.mjs";
import { terraformDir } from "./deploy-env.mjs";
import { appSharedPath, infisicalConfigPath, readAppSlug, readWorkspaceId } from "./infisical-app.mjs";
import { parsePostgresConn, parseStandupMigrations, standupConfigPath } from "./standup-migrations.mjs";
import { parseGitRemoteUrl } from "./standup.mjs";
import { supabaseOriginsMatch } from "./supabase-origins.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const INFISICAL_OUTPUT_KEYS = [
  "WEB_BUCKET",
  "CLOUDFRONT_DISTRIBUTION_ID",
  "LAMBDA_FUNCTION_NAME",
  "NEXT_PUBLIC_API_URL",
];
const INFISICAL_WEB_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const GH_SECRETS = ["INFISICAL_CLIENT_ID", "INFISICAL_CLIENT_SECRET", "AWS_ROLE_ARN"];
const GH_VARS = ["INFISICAL_PROJECT_SLUG", "INFISICAL_APP_SLUG"];

export const HELP = `Usage:
  npm run deploy:check -- --env <dev|prod>
  npm run deploy:check -- --help

Read-only health check of Terraform outputs, AWS, DNS, Infisical names,
GitHub Actions config, and local laptop files. Safe after standup and
before Deploy app (empty bucket / missing site is a warning).
`;

export function parseCheckArgs(argv) {
  const args = argv.slice(2);
  const opts = { env: null, help: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") opts.help = true;
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

export function corsHasLocalhost(cors) {
  return /localhost|127\.0\.0\.1/i.test(String(cors || ""));
}

export function readTfvarsString(path, key) {
  if (!path || !existsSync(path)) return "";
  const escaped = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = readFileSync(path, "utf8").match(new RegExp(`^\\s*${escaped}\\s*=\\s*"([^"]+)"`, "m"));
  return m ? m[1].trim() : "";
}

export function stackRegion({ apiUrl = "", tfDir = "" } = {}) {
  const fromApi = String(apiUrl).match(/execute-api\.([a-z0-9-]+)\.amazonaws\.com/i);
  if (fromApi) return fromApi[1];
  const tfvars = tfDir ? join(tfDir, "terraform.tfvars") : "";
  if (tfvars && existsSync(tfvars)) {
    const m = readFileSync(tfvars, "utf8").match(/^\s*aws_region\s*=\s*"([^"]+)"/m);
    if (m) return m[1];
  }
  return "us-east-1";
}

export function apiRootLooksHealthy(status, body) {
  if (status !== 200) return false;
  if (!body) return true;
  if (/<html/i.test(body)) return false;
  return true;
}

export function classifySiteResponse(status, body) {
  if (status === 200 && /<html/i.test(body || "")) return "ok";
  if (status === 403 || status === 404) return "empty";
  if (status === 0) return "unreachable";
  return "other";
}

function capture(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (r.error && !opts.allowFail) throw r.error;
  return {
    ok: !r.error && r.status === 0,
    status: r.status ?? 1,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
  };
}

function tfRaw(tfDir, name) {
  const r = capture("terraform", [`-chdir=${tfDir}`, "output", "-raw", name], { allowFail: true });
  if (!r.ok) return "";
  const v = r.stdout;
  if (!v || v === "null" || v === "None") return "";
  return v;
}

function awsJson(args, region) {
  const extra = region ? ["--region", region] : [];
  const r = capture("aws", [...extra, ...args, "--output", "json"], { allowFail: true });
  if (!r.ok) return { ok: false, json: null, err: r.stderr || r.stdout };
  try {
    return { ok: true, json: JSON.parse(r.stdout || "null") };
  } catch {
    return { ok: false, json: null, err: "invalid aws json" };
  }
}

function ghJson(args) {
  const r = capture("gh", args, { allowFail: true });
  if (!r.ok) return null;
  try {
    return JSON.parse(r.stdout || "null");
  } catch {
    return null;
  }
}

function listNames(rows) {
  const out = new Set();
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    if (row?.name) out.add(row.name);
  }
  return out;
}

function gitRemote() {
  const r = capture("git", ["remote", "get-url", "origin"], { allowFail: true });
  return parseGitRemoteUrl(r.stdout || "");
}

async function httpGet(url, { timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    const body = await res.text();
    return { status: res.status, body: body.slice(0, 4000), headers: res.headers };
  } catch {
    return { status: 0, body: "", headers: null };
  } finally {
    clearTimeout(t);
  }
}

function withHttps(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url.replace(/\/$/, "");
  return `https://${url.replace(/\/$/, "")}`;
}

class Checker {
  constructor() {
    this.failed = 0;
    this.warned = 0;
    this.passed = 0;
  }

  ok(label, detail = "") {
    this.passed += 1;
    console.log(`  ok     ${label}${detail ? ` — ${detail}` : ""}`);
  }

  warn(label, detail = "") {
    this.warned += 1;
    console.log(`  warn   ${label}${detail ? ` — ${detail}` : ""}`);
  }

  fail(label, detail = "") {
    this.failed += 1;
    console.log(`  fail   ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function checkLaptopFiles(check, env) {
  console.log("\nLaptop files");
  const web = resolveEnvFile(join(root, "apps/web"), env);
  if (!web) {
    check.fail(
      `apps/web env for ${env}`,
      env === "dev"
        ? `create one of ${envFileLabel("apps/web", "dev")}`
        : `create ${envFileLabel("apps/web", env)} (not .env.production.local)`,
    );
  } else {
    const values = readEnvFile(web);
    const missing = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter(
      (k) => !values[k]?.trim(),
    );
    if (missing.length) check.fail(relative(root, web), `missing ${missing.join(", ")}`);
    else check.ok(relative(root, web), "supabase public keys present");
    const tfUrl = readTfvarsString(join(terraformDir(root, env), "terraform.tfvars"), "supabase_url");
    const webUrl = values.NEXT_PUBLIC_SUPABASE_URL;
    if (tfUrl && webUrl) {
      if (supabaseOriginsMatch(tfUrl, webUrl)) {
        check.ok("supabase URL pair", "laptop web env matches terraform.tfvars");
      } else {
        check.fail(
          "supabase URL pair",
          "laptop NEXT_PUBLIC_SUPABASE_URL does not match terraform supabase_url — same project only",
        );
      }
    } else if (webUrl && !tfUrl) {
      check.warn("supabase URL pair", "terraform.tfvars has no supabase_url to compare");
    }
  }

  const dbFile = resolveEnvFile(join(root, "supabase"), env);
  if (!dbFile) {
    check.warn(`supabase env for ${env}`, `create ${envFileLabel("supabase", env)} to re-run standup SQL`);
  } else {
    const url = readEnvFile(dbFile).SUPABASE_DB_URL;
    const conn = parsePostgresConn(url || "");
    if (!conn) check.fail(relative(root, dbFile), "SUPABASE_DB_URL missing or unparseable");
    else check.ok(relative(root, dbFile), `host ${conn.host}`);
  }

  const standupFile = standupConfigPath(root);
  if (!existsSync(standupFile)) {
    check.warn(".lattice/standup.json", "missing — standup SQL skipped");
    return;
  }
  try {
    const files = parseStandupMigrations(JSON.parse(readFileSync(standupFile, "utf8")), env);
    if (!files.length) check.warn(".lattice/standup.json", `no migrations listed for ${env}`);
    else {
      const missing = files.filter((f) => !existsSync(join(root, f)));
      if (missing.length) check.fail(".lattice/standup.json", `missing ${missing.join(", ")}`);
      else check.ok(".lattice/standup.json", `${files.length} file(s) for ${env}`);
    }
  } catch (err) {
    check.fail(".lattice/standup.json", err instanceof Error ? err.message : String(err));
  }
}

function checkTerraform(check, env) {
  console.log("\nTerraform");
  const tfDir = terraformDir(root, env);
  if (!existsSync(join(tfDir, "terraform.tfstate")) && !existsSync(join(tfDir, ".terraform/terraform.tfstate"))) {
    check.warn("terraform state", "no local state file — outputs may still work if backend is remote");
  }
  const outputs = {
    apiUrl: tfRaw(tfDir, "api_url"),
    bucket: tfRaw(tfDir, "web_bucket_name"),
    distId: tfRaw(tfDir, "web_cloudfront_distribution_id"),
    cfDomain: tfRaw(tfDir, "web_cloudfront_domain"),
    publicUrl: tfRaw(tfDir, "web_public_base_url"),
    customDomain: tfRaw(tfDir, "web_custom_domain"),
    lambda: tfRaw(tfDir, "api_lambda_function_name"),
    acmStatus: tfRaw(tfDir, "acm_certificate_status"),
    zoneId: tfRaw(tfDir, "route53_hosted_zone_id"),
    manageDns: tfRaw(tfDir, "manage_web_dns_in_route53"),
  };
  for (const [key, label] of [
    ["apiUrl", "api_url"],
    ["bucket", "web_bucket_name"],
    ["distId", "web_cloudfront_distribution_id"],
    ["cfDomain", "web_cloudfront_domain"],
    ["lambda", "api_lambda_function_name"],
  ]) {
    if (outputs[key]) check.ok(label, outputs[key].replace(/^https:\/\//, ""));
    else check.fail(label, "empty — run standup / deploy:aws first");
  }
  if (outputs.customDomain) {
    if (outputs.acmStatus === "ISSUED") check.ok("acm_certificate_status", "ISSUED");
    else check.fail("acm_certificate_status", outputs.acmStatus || "missing");
    check.ok("web_custom_domain", outputs.customDomain);
  } else {
    check.warn("web_custom_domain", "not set — CloudFront default only");
  }
  outputs.region = stackRegion({ apiUrl: outputs.apiUrl, tfDir });
  check.ok("aws_region", outputs.region);
  return outputs;
}

function checkAws(check, env, outputs) {
  console.log("\nAWS");
  const region = outputs.region || "us-east-1";
  if (outputs.lambda) {
    const fn = awsJson(
      ["lambda", "get-function-configuration", "--function-name", outputs.lambda],
      region,
    );
    if (!fn.ok) check.fail("lambda", fn.err || "get-function-configuration failed");
    else {
      const state = fn.json?.State;
      const update = fn.json?.LastUpdateStatus;
      if (state === "Active" && update === "Successful") check.ok("lambda state", `${state} / ${update}`);
      else check.fail("lambda state", `${state} / ${update}`);
      const cors = fn.json?.Environment?.Variables?.CORS_ORIGINS || "";
      if (env === "prod" && corsHasLocalhost(cors)) {
        check.fail("lambda CORS_ORIGINS", "prod lists localhost — re-apply after the CORS twin fix");
      } else if (env === "dev" && !corsHasLocalhost(cors)) {
        check.warn("lambda CORS_ORIGINS", "dev is missing localhost:3001");
      } else {
        check.ok("lambda CORS_ORIGINS", env === "prod" ? "no localhost" : "includes localhost");
      }
      if (outputs.customDomain && cors && !cors.includes(`https://${outputs.customDomain}`)) {
        check.warn("lambda CORS_ORIGINS", `does not list https://${outputs.customDomain}`);
      }
    }
  }

  if (outputs.bucket) {
    const loc = capture(
      "aws",
      ["--region", region, "s3api", "head-bucket", "--bucket", outputs.bucket],
      { allowFail: true },
    );
    if (!loc.ok) check.fail("s3 bucket", outputs.bucket);
    else {
      check.ok("s3 bucket", outputs.bucket);
      const listed = awsJson(
        ["s3api", "list-objects-v2", "--bucket", outputs.bucket, "--max-items", "5"],
        region,
      );
      const n = listed.json?.KeyCount ?? listed.json?.Contents?.length ?? 0;
      if (n > 0) check.ok("s3 objects", `${n}+ keys (site has been uploaded)`);
      else check.warn("s3 objects", "empty — expected before the first web sync / Deploy app");
    }
  }

  if (outputs.distId) {
    const dist = awsJson(["cloudfront", "get-distribution", "--id", outputs.distId]);
    const status = dist.json?.Distribution?.Status;
    const aliases = dist.json?.Distribution?.DistributionConfig?.Aliases?.Items || [];
    if (!dist.ok) check.fail("cloudfront", dist.err || outputs.distId);
    else {
      if (status === "Deployed") check.ok("cloudfront status", status);
      else check.warn("cloudfront status", status || "unknown");
      if (outputs.customDomain && !aliases.includes(outputs.customDomain)) {
        check.fail("cloudfront alias", `${outputs.customDomain} not on ${outputs.distId}`);
      } else if (outputs.customDomain) {
        check.ok("cloudfront alias", outputs.customDomain);
      }
    }
  }
}

function checkDns(check, outputs) {
  console.log("\nDNS");
  if (!outputs.customDomain) {
    check.warn("custom domain DNS", "skipped");
    return;
  }
  const ns = capture("dig", ["+short", "NS", outputs.customDomain], { allowFail: true });
  const nsLine = (ns.stdout || "").split("\n").filter(Boolean);
  if (nsLine.some((n) => /awsdns/i.test(n))) check.ok(`NS ${outputs.customDomain}`, "Route 53");
  else if (ns.stdout) check.warn(`NS ${outputs.customDomain}`, "not awsdns yet");
  else check.fail(`NS ${outputs.customDomain}`, "no nameservers");

  const a = capture("dig", ["+short", outputs.customDomain], { allowFail: true });
  if (a.stdout) check.ok(`A/CNAME ${outputs.customDomain}`, "resolves");
  else check.fail(`A/CNAME ${outputs.customDomain}`, "does not resolve");
}

async function checkSupabaseAuth(check, env) {
  console.log("\nSupabase Auth");
  const web = resolveEnvFile(join(root, "apps/web"), env);
  if (!web) {
    check.warn("supabase auth", `skipped — no apps/web/.env.${env}`);
    return;
  }
  const values = readEnvFile(web);
  const url = String(values.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const anon = String(values.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) {
    check.warn("supabase auth", "URL or anon key missing in laptop web env");
    return;
  }
  let res;
  try {
    res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
  } catch (err) {
    check.fail("supabase auth settings", err instanceof Error ? err.message : String(err));
    return;
  }
  if (res.status === 401 || res.status === 403) {
    check.fail(
      "supabase anon key",
      "Invalid API key — this URL and anon key are not a pair. Copy the publishable key from the same project as NEXT_PUBLIC_SUPABASE_URL.",
    );
    return;
  }
  if (!res.ok) {
    check.warn("supabase auth settings", `HTTP ${res.status}`);
    return;
  }
  let settings = {};
  try {
    settings = await res.json();
  } catch {
    check.warn("supabase auth settings", "could not parse JSON");
    return;
  }
  check.ok("supabase anon key", "accepted by this project");
  const wantProvider = String(values.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDER || "google").trim();
  const enabled = Boolean(settings.external?.[wantProvider]);
  if (enabled) check.ok(`${wantProvider} provider`, "enabled");
  else {
    check.fail(
      `${wantProvider} provider`,
      `disabled on this project — Authentication → Providers → ${wantProvider} (add Client ID/secret; add this project’s /auth/v1/callback in Google Cloud)`,
    );
  }
}

async function checkHttp(check, outputs) {
  console.log("\nHTTP");
  const api = withHttps(outputs.apiUrl);
  if (api) {
    const rootRes = await httpGet(`${api}/`);
    if (apiRootLooksHealthy(rootRes.status, rootRes.body)) check.ok("GET /", `${api} → 200`);
    else check.fail("GET /", `${api} → ${rootRes.status || "unreachable"}`);
    const things = await httpGet(`${api}/things`);
    if (things.status === 401) check.ok("GET /things", "401 (auth wired)");
    else check.warn("GET /things", `expected 401, got ${things.status || "unreachable"}`);
  }

  const sites = [];
  if (outputs.cfDomain) sites.push(["CloudFront", `https://${outputs.cfDomain}`]);
  if (outputs.publicUrl) sites.push(["public URL", outputs.publicUrl]);
  const seen = new Set();
  for (const [label, url] of sites) {
    if (seen.has(url)) continue;
    seen.add(url);
    const res = await httpGet(url);
    const kind = classifySiteResponse(res.status, res.body);
    if (kind === "ok") check.ok(label, url);
    else if (kind === "empty") {
      check.warn(label, `${url} → ${res.status} (empty origin — upload the site next)`);
    } else {
      check.fail(label, `${url} → ${res.status || "unreachable"}`);
    }
  }
}

function checkInfisical(check, env) {
  console.log("\nInfisical");
  if (!existsSync(infisicalConfigPath(root))) {
    check.warn(".lattice/infisical.json", "missing");
    return;
  }
  const appSlug = readAppSlug(root);
  const path = appSharedPath(appSlug);
  let projectId = "";
  try {
    projectId = readWorkspaceId(root);
  } catch {
    check.warn("Infisical project", "no .infisical.json — skip secret names");
    return;
  }
  const listed = capture(
    "infisical",
    ["secrets", "--env", env, "--path", path, "--projectId", projectId, "--plain", "--silent"],
    { allowFail: true },
  );
  const names = new Set();
  for (const line of (listed.stdout || "").split("\n")) {
    const key = line.split("=")[0]?.trim();
    if (key) names.add(key);
  }
  if (!listed.ok && names.size === 0) {
    const json = capture(
      "infisical",
      ["secrets", "--env", env, "--path", path, "--projectId", projectId],
      { allowFail: true },
    );
    for (const m of json.stdout.matchAll(/SECRET NAME[^\n]*\n(?:[^\n]*\n)*?/g)) {
      void m;
    }
    for (const line of json.stdout.split("\n")) {
      const cell = line.match(/│\s*([A-Z0-9_]+)\s*│/);
      if (cell) names.add(cell[1]);
    }
    if (!names.size) {
      check.warn(`Infisical ${path} (${env})`, "could not list secrets — infisical login?");
      return;
    }
  }
  for (const key of INFISICAL_OUTPUT_KEYS) {
    if (names.has(key)) check.ok(`Infisical ${key}`, path);
    else check.fail(`Infisical ${key}`, `missing from ${path} (${env})`);
  }
  for (const key of INFISICAL_WEB_KEYS) {
    if (names.has(key)) check.ok(`Infisical ${key}`, path);
    else {
      check.warn(
        `Infisical ${key}`,
        `missing — set before GitHub Deploy app so the static build uses the ${env} Supabase project`,
      );
    }
  }
}

function checkGithub(check, env) {
  console.log("\nGitHub");
  const remote = gitRemote();
  if (!remote?.owner || !remote?.repo) {
    check.fail("git remote", "could not parse origin");
    return;
  }
  const { owner, repo } = remote;
  check.ok("repo", `${owner}/${repo}`);
  const secrets = listNames(ghJson(["api", `repos/${owner}/${repo}/actions/secrets`])?.secrets);
  for (const key of GH_SECRETS) {
    if (secrets.has(key)) check.ok(`secret ${key}`);
    else check.fail(`secret ${key}`, "missing");
  }
  const vars = listNames(ghJson(["api", `repos/${owner}/${repo}/actions/variables`])?.variables);
  for (const key of GH_VARS) {
    if (vars.has(key)) check.ok(`variable ${key}`);
    else check.fail(`variable ${key}`, "missing");
  }
  const envRes = capture("gh", ["api", `repos/${owner}/${repo}/environments/${env}`], { allowFail: true });
  if (envRes.ok) check.ok(`environment ${env}`);
  else check.fail(`environment ${env}`, "missing");
}

async function main() {
  const opts = parseCheckArgs(process.argv);
  if (opts.help) {
    process.stdout.write(HELP);
    return;
  }
  console.log(`→ deploy:check ${opts.env}\n`);
  const check = new Checker();
  checkLaptopFiles(check, opts.env);
  await checkSupabaseAuth(check, opts.env);
  const outputs = checkTerraform(check, opts.env);
  checkAws(check, opts.env, outputs);
  checkDns(check, outputs);
  await checkHttp(check, outputs);
  checkInfisical(check, opts.env);
  checkGithub(check, opts.env);

  console.log(
    `\n${check.passed} ok, ${check.warned} warn, ${check.failed} fail`,
  );
  if (check.failed) {
    console.log("Fix the fail lines before Deploy app.");
    process.exit(1);
  }
  if (check.warned) {
    console.log(
      "Warnings are expected if the static site is not uploaded yet. Next: npm run standup -- --env " +
        opts.env +
        " (or deploy:aws / Deploy app) after Infisical supabase keys are set.",
    );
  } else {
    console.log("Infra looks ready.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
