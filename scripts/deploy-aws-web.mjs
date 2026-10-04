#!/usr/bin/env node
/**
 * Front-end only: static Next export + S3 sync + CloudFront invalidation.
 *
 * Does **not** build the API Lambda bundle and does **not** run `terraform apply`.
 * Reads `api_url`, bucket, and distribution id from **existing** Terraform state
 * (run a full `npm run deploy:aws -- --env <env>` at least once after infra changes).
 *
 *   npm run deploy:aws:web
 *   npm run deploy:aws:web -- --env prod
 *
 * `NEXT_PUBLIC_API_URL` is taken from Terraform output (same as full deploy).
 * Dev reads the first of `apps/web/.env.dev`, `.env.local`, `.env`.
 * Any other `--env` reads only `apps/web/.env.<env>` (prod is `.env.prod`).
 *
 * Prerequisites: AWS CLI, Terraform, `terraform.tfvars` in `infra/terraform/envs/<env>/`.
 * See docs/deploy-aws.md.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebEnv, takeEnvArg, terraformDir } from "./deploy-env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function capture(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `${cmd} failed`);
    process.exit(r.status ?? 1);
  }
  return (r.stdout || "").trim();
}

function logPublicHosts() {
  for (const [label, value] of [
    ["Supabase host", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["API host", process.env.NEXT_PUBLIC_API_URL],
  ]) {
    if (!value) continue;
    try {
      console.log(`→ ${label}: ${new URL(value).host}`);
    } catch {
      console.warn(`→ ${label}: NEXT_PUBLIC value is not a valid URL`);
    }
  }
}

function main() {
  const { env, argv } = takeEnvArg(process.argv.slice(2));
  if (argv.length > 0) {
    console.error(`Unknown argument: ${argv[0]}`);
    process.exit(1);
  }
  const tfDir = terraformDir(root, env);
  const chdir = `-chdir=${tfDir}`;
  console.log(`→ env ${env} (${tfDir})\n`);
  loadWebEnv(root, env);

  console.log(`→ terraform init (${env}; read outputs only; no apply)\n`);
  run("terraform", [chdir, "init", "-input=false"]);

  const apiUrl = capture("terraform", [chdir, "output", "-raw", "api_url"]);
  process.env.NEXT_PUBLIC_API_URL = apiUrl;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn(
      "\nWarning: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.\n" +
        "Set them with `infisical run --env=" +
        env +
        "` or in apps/web/.env." +
        (env === "dev" ? "{dev,local}" : env) +
        " before running this script.\n" +
        "Web build may fail or point at the wrong Supabase project.\n",
    );
  }

  logPublicHosts();
  console.log("→ npm run web:build:static\n");
  run("npm", ["run", "web:build:static"]);

  const bucket = capture("terraform", [chdir, "output", "-raw", "web_bucket_name"]);
  const outDir = join(root, "apps/web/out");
  if (!existsSync(outDir)) {
    console.error(`Missing ${outDir} after static build.`);
    process.exit(1);
  }

  console.log(`→ aws s3 sync → s3://${bucket}\n`);
  run("aws", ["s3", "sync", outDir, `s3://${bucket}`, "--delete"]);

  const distributionId = capture("terraform", [chdir, "output", "-raw", "web_cloudfront_distribution_id"]);
  console.log(`→ aws cloudfront create-invalidation (${distributionId})\n`);
  run("aws", [
    "cloudfront",
    "create-invalidation",
    "--distribution-id",
    distributionId,
    "--paths",
    "/*",
  ]);

  const domain = capture("terraform", [chdir, "output", "-raw", "web_cloudfront_domain"]);
  console.log("\nWeb deploy finished.");
  console.log(`  Web (HTTPS): https://${domain}/`);
  console.log(`  API (from state): ${apiUrl}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
