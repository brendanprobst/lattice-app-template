#!/usr/bin/env node
/**
 * Deploy API (Lambda bundle) + Terraform (AWS infra) + static web build + S3 sync.
 *
 * Order: build Lambda → terraform apply → ACM wait (path C) → second apply for
 * CloudFront alias/cert + CORS when ISSUED → read api_url → build web → s3 sync.
 *
 *   npm run deploy:aws
 *   npm run deploy:aws -- --env prod
 *   npm run deploy:aws -- --plan-only
 *   npm run deploy:aws -- --skip-web          # infra + API only (no static site build/sync)
 *   npm run deploy:aws -- --skip-api-build
 *   npm run deploy:aws -- --auto-approve     # terraform apply -auto-approve (required in non-TTY)
 *
 * `--env` selects `infra/terraform/envs/<env>` (default `dev`). Dev web env is the
 * first of `.env.dev`, `.env.local`, `.env`. Any other env reads only
 * `apps/web/.env.<env>` (prod is `apps/web/.env.prod`).
 *
 * Web-only (no Lambda / no apply): npm run deploy:aws:web — see scripts/deploy-aws-web.mjs
 *
 * Prerequisites: AWS CLI + credentials, Terraform, terraform.tfvars in the selected env
 * (or equivalent TF_VAR_*). See docs/deploy-aws.md.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { loadWebEnv, takeEnvArg, terraformDir } from "./deploy-env.mjs";
import { appSharedPath, infisicalConfigPath, readAppSlug } from "./infisical-app.mjs";
import {
  PHASE4_ACM_WAIT,
  pollAcmUntilIssued,
  printRegistrarCnames,
  rerunAfterIssuedMessage,
  tfOutputOrNull,
} from "./acm-wait.mjs";

export { PHASE4_ACM_WAIT, pollAcmUntilIssued };

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const taken = takeEnvArg(argv.slice(2));
  const opts = {
    env: taken.env,
    planOnly: false,
    skipWeb: false,
    skipApiBuild: false,
    autoApprove: false,
  };
  for (const a of taken.argv) {
    if (a === "--plan-only") opts.planOnly = true;
    else if (a === "--skip-web") opts.skipWeb = true;
    else if (a === "--skip-api-build") opts.skipApiBuild = true;
    else if (a === "--auto-approve") opts.autoApprove = true;
    else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else {
      console.error(`Unexpected argument: ${a}`);
      process.exit(1);
    }
  }
  return opts;
}

function run(cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: false,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function capture(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    if (opts.allowFail) return "";
    console.error(r.stderr || r.stdout || `${cmd} failed`);
    process.exit(r.status ?? 1);
  }
  return (r.stdout || "").trim();
}

function tfRaw(chdir, name) {
  return tfOutputOrNull(capture("terraform", [chdir, "output", "-raw", name], { allowFail: true }));
}

function applyTerraform(chdir, autoApprove) {
  if (!autoApprove && !process.stdout.isTTY) {
    console.error(
      "Refusing terraform apply in a non-interactive terminal without --auto-approve (e.g. CI).",
    );
    process.exit(1);
  }
  const applyArgs = [chdir, "apply", "-input=false"];
  if (autoApprove) applyArgs.push("-auto-approve");
  console.log("→ terraform apply\n");
  const r = spawnSync("terraform", applyArgs, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  if (r.error) throw r.error;
  return r.status === 0;
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

function registrarRecords(chdir) {
  return {
    domain: tfRaw(chdir, "web_custom_domain"),
    cloudfrontDomain: tfRaw(chdir, "web_cloudfront_domain"),
    validationName: tfRaw(chdir, "acm_validation_record_name"),
    validationValue: tfRaw(chdir, "acm_validation_record_value"),
    certArn: tfRaw(chdir, "acm_certificate_arn"),
    status: tfRaw(chdir, "acm_certificate_status"),
    manageDns: tfRaw(chdir, "manage_web_dns_in_route53") === "true",
  };
}

function printPathCRecords(rec) {
  printRegistrarCnames({
    domain: rec.domain,
    cloudfrontDomain: rec.cloudfrontDomain,
    validationName: rec.validationName,
    validationValue: rec.validationValue,
  });
}

function exitPendingAcm(rec) {
  if (rec.domain && !rec.manageDns) printPathCRecords(rec);
  console.error(rerunAfterIssuedMessage());
  process.exit(1);
}

/**
 * After the first apply: print path-C CNAMEs, poll ACM, then apply CloudFront
 * alias/cert + Lambda CORS_ORIGINS only when the cert is ISSUED.
 */
export function waitForIssuedAcmThenAttach(chdir, autoApprove) {
  const rec = registrarRecords(chdir);
  if (!rec.domain) return;

  if (!rec.manageDns) {
    printPathCRecords(rec);
  }

  if (rec.status === "ISSUED") {
    console.log("→ ACM ISSUED. CloudFront alias/cert and CORS attach on this apply when needed.");
    return;
  }

  let status = rec.status;
  if (rec.certArn) {
    try {
      status = pollAcmUntilIssued(rec.certArn);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      exitPendingAcm(rec);
    }
  }

  if (status === "ISSUED") {
    console.log("→ ACM ISSUED. Applying CloudFront alias/cert and Lambda CORS_ORIGINS.\n");
    if (!applyTerraform(chdir, autoApprove)) {
      console.error("Second terraform apply (CloudFront alias/cert) failed.");
      process.exit(1);
    }
    return;
  }

  if (rec.manageDns) {
    console.error(
      `ACM for ${rec.domain} is ${status || "unknown"}, not ISSUED. Route 53 validation did not finish.`,
    );
    process.exit(1);
  }
  exitPendingAcm({ ...rec, status });
}

function main() {
  const opts = parseArgs(process.argv);
  const tfDir = terraformDir(root, opts.env);
  const chdir = `-chdir=${tfDir}`;
  console.log(`→ env ${opts.env} (${tfDir})\n`);

  if (!opts.skipApiBuild) {
    console.log("→ npm run api:build:lambda\n");
    run("npm", ["run", "api:build:lambda"]);
  }

  console.log(`→ terraform init (${opts.env})\n`);
  run("terraform", [chdir, "init", "-input=false"]);

  if (opts.planOnly) {
    console.log("→ terraform plan\n");
    run("terraform", [chdir, "plan", "-input=false"]);
    console.log("\nPlan complete (--plan-only). No apply, no web build.");
    return;
  }

  if (!applyTerraform(chdir, opts.autoApprove)) {
    const rec = registrarRecords(chdir);
    if (rec.domain && !rec.manageDns) {
      printPathCRecords(rec);
      console.error(rerunAfterIssuedMessage());
    }
    process.exit(1);
  }

  waitForIssuedAcmThenAttach(chdir, opts.autoApprove);
  syncInfisicalOutputs(opts.env);

  if (opts.skipWeb) {
    console.log("\nSkipped web build and S3 sync (--skip-web).");
    printOutputs(chdir);
    return;
  }

  loadWebEnv(root, opts.env);

  const apiUrl = capture("terraform", [chdir, "output", "-raw", "api_url"]);
  process.env.NEXT_PUBLIC_API_URL = apiUrl;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn(
      "\nWarning: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.\n" +
        "Set them with `infisical run --env=" +
        opts.env +
        "` or in apps/web/.env." +
        (opts.env === "dev" ? "{dev,local}" : opts.env) +
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

  console.log("\nDeploy finished.");
  printOutputs(chdir);
}

function syncInfisicalOutputs(envName) {
  if (process.env.GITHUB_ACTIONS) {
    console.log("→ skip Infisical output sync (GitHub Actions)\n");
    return;
  }
  if (!existsSync(join(root, ".infisical.json"))) {
    console.log("→ skip Infisical output sync (no .infisical.json)\n");
    return;
  }
  if (!existsSync(infisicalConfigPath(root))) {
    console.log("→ skip Infisical output sync (no .lattice/infisical.json)\n");
    return;
  }
  const check = spawnSync("infisical", ["--version"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (check.error || check.status !== 0) {
    console.warn(
      "→ skip Infisical output sync (install the Infisical CLI and run `infisical login`)\n",
    );
    return;
  }
  const appSlug = readAppSlug(root);
  console.log(`→ sync Terraform outputs to Infisical ${appSharedPath(appSlug)} (${envName})\n`);
  const result = spawnSync(
    "node",
    ["scripts/sync-infisical-terraform-outputs.mjs", "--env", envName],
    {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      shell: false,
    },
  );
  if (result.error || result.status !== 0) {
    console.warn(
      `\nInfisical output sync failed. Apply already finished. Re-run:\n  npm run infisical:sync-outputs -- --env ${envName}\n`,
    );
  }
}

function printOutputs(chdir) {
  const apiUrl = capture("terraform", [chdir, "output", "-raw", "api_url"]);
  const domain = capture("terraform", [chdir, "output", "-raw", "web_cloudfront_domain"]);
  const custom = tfRaw(chdir, "web_custom_domain");
  console.log("\nOutputs:");
  console.log(`  API:        ${apiUrl}`);
  console.log(`  Web (HTTPS): https://${domain}/`);
  if (custom) console.log(`  Custom:     https://${custom}/`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
