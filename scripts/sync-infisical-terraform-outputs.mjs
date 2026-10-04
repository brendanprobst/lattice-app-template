#!/usr/bin/env node
/**
 * Write stable Terraform outputs into Infisical /<appSlug>/shared.
 *
 *   npm run infisical:sync-outputs -- --env dev
 *   npm run infisical:sync-outputs -- --env prod
 *
 * `appSlug` comes from `.lattice/infisical.json` so laptop sync and GitHub
 * Deploy app agree. `npm run deploy:aws` calls this after a successful apply
 * when `.infisical.json` exists. GitHub Actions does not run Terraform, so it
 * cannot do this write. Deploy app reads the same keys back from /<appSlug>/shared.
 *
 * Requires `infisical login` as a user who can write /<appSlug>/shared. The
 * GitHub machine identity is read-only and cannot run this script.
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { takeEnvArg, terraformDir } from "./deploy-env.mjs";
import { appSharedPath, readAppSlug, readWorkspaceId } from "./infisical-app.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const OUTPUT_KEYS = [
  ["web_bucket_name", "WEB_BUCKET"],
  ["web_cloudfront_distribution_id", "CLOUDFRONT_DISTRIBUTION_ID"],
  ["api_lambda_function_name", "LAMBDA_FUNCTION_NAME"],
  ["api_url", "NEXT_PUBLIC_API_URL"],
];

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || `${cmd} failed`);
    process.exit(result.status ?? 1);
  }
  return (result.stdout || "").trim();
}

function projectId() {
  return readWorkspaceId(root);
}

export function existingInfisicalValues(json) {
  const map = new Map();
  if (!json) return map;
  if (Array.isArray(json)) {
    for (const item of json) {
      const key = item.secretKey || item.key || item.name;
      const value = item.secretValue || item.value;
      if (key && typeof value === "string") map.set(key, value);
    }
    return map;
  }
  if (typeof json === "object") {
    const bag = json.secrets || json.data || json;
    if (Array.isArray(bag)) return existingInfisicalValues(bag);
    for (const [key, value] of Object.entries(bag)) {
      if (typeof value === "string") map.set(key, value);
      else if (value && typeof value === "object") {
        const inner = value.secretValue || value.value;
        if (typeof inner === "string") map.set(key, inner);
      }
    }
  }
  return map;
}

function currentSharedSecrets(envName, id, sharedPath) {
  const result = spawnSync(
    "infisical",
    [
      "secrets",
      "--env",
      envName,
      "--path",
      sharedPath,
      "--projectId",
      id,
      "--silent",
      "--output",
      "json",
    ],
    { cwd: root, encoding: "utf8", shell: false },
  );
  if (result.status !== 0) return null;
  try {
    return existingInfisicalValues(JSON.parse(result.stdout || "{}"));
  } catch {
    return null;
  }
}

function logSyncedKey(secretName, value) {
  if (secretName === "NEXT_PUBLIC_API_URL") {
    try {
      console.log(`→ ${secretName}: ${new URL(value).host}`);
    } catch {
      console.warn(`→ ${secretName}: not a valid URL`);
    }
    return;
  }
  console.log(`→ ${secretName}`);
}

function ensureFolder(envName, id, name, parentPath) {
  const result = spawnSync(
    "infisical",
    [
      "secrets",
      "folders",
      "create",
      "--name",
      name,
      "--path",
      parentPath,
      "--env",
      envName,
      "--projectId",
      id,
      "--silent",
    ],
    { cwd: root, encoding: "utf8", shell: false },
  );
  if (result.status === 0) return;
  const detail = `${result.stderr || ""}\n${result.stdout || ""}`;
  if (/already exists/i.test(detail)) return;
  if (result.error) console.error(result.error.message);
  const full = parentPath === "/" ? `/${name}` : `${parentPath}/${name}`;
  console.error(detail.trim() || `Could not create Infisical folder ${full}`);
  process.exit(result.status ?? 1);
}

function ensureSharedFolder(envName, id, appSlug) {
  ensureFolder(envName, id, appSlug, "/");
  ensureFolder(envName, id, "shared", `/${appSlug}`);
}

function main() {
  const { env, argv } = takeEnvArg(process.argv.slice(2));
  if (argv.length > 0) {
    console.error(`Unknown argument: ${argv[0]}`);
    process.exit(1);
  }

  const appSlug = readAppSlug(root);
  const sharedPath = appSharedPath(appSlug);
  const tfDir = terraformDir(root, env);
  const chdir = `-chdir=${tfDir}`;
  console.log(`→ terraform init (${env}; read outputs only; no apply)\n`);
  run("terraform", [chdir, "init", "-input=false"]);

  const wanted = OUTPUT_KEYS.map(([outputName, secretName]) => {
    const value = capture("terraform", [chdir, "output", "-raw", outputName]);
    if (!value) {
      console.error(`terraform output ${outputName} was empty in ${env}`);
      process.exit(1);
    }
    return { secretName, value };
  });

  const id = projectId();
  const current = currentSharedSecrets(env, id, sharedPath);
  if (
    current &&
    wanted.every(({ secretName, value }) => current.get(secretName) === value)
  ) {
    console.log("skip Infisical output sync (unchanged)");
    return;
  }

  for (const { secretName, value } of wanted) {
    logSyncedKey(secretName, value);
  }

  ensureSharedFolder(env, id, appSlug);
  const pairs = wanted.map(({ secretName, value }) => `${secretName}=${value}`);

  const result = spawnSync(
    "infisical",
    [
      "secrets",
      "set",
      ...pairs,
      "--env",
      env,
      "--path",
      sharedPath,
      "--projectId",
      id,
      "--silent",
    ],
    { cwd: root, stdio: "inherit", shell: false },
  );
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`Wrote ${pairs.length} Terraform outputs to Infisical ${sharedPath} (${env}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
