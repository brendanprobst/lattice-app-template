#!/usr/bin/env node
/**
 * Create the account S3 + DynamoDB lock, write `.lattice/terraform-backend.json`,
 * and migrate any local stack state. Never prints state JSON.
 *
 *   npm run terraform:state
 *
 * Idempotent. Deploy app does not use this bucket.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readAppSlug } from "./infisical-app.mjs";
import {
  inspectStateBucket,
  inspectStateObject,
  readTerraformBackend,
  remoteStateResourceCount,
  stateObjectKey,
  terraformBackendConfigPath,
  terraformInitArgs,
  TF_BACKEND_STACKS,
} from "./terraform-backend.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const HELP = `Usage:
  npm run terraform:state
  npm run terraform:state -- --verify
  npm run terraform:state -- --help

Create / reuse s3://lattice-tfstate-<account> and DynamoDB lattice-tfstate-locks.
Write .lattice/terraform-backend.json. Migrate local terraform.tfstate for each
stack that has one (dev, prod, bootstrap, dns-zone).

--verify checks the S3 object size, bucket hardening, and terraform state list
(readable from S3). Does not print state JSON.
`;

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: false });
  return {
    ok: !r.error && r.status === 0,
    status: r.status ?? 1,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
  };
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function awsJson(args, region) {
  const extra = region ? ["--region", region] : [];
  const r = capture("aws", [...extra, ...args, "--output", "json"]);
  if (!r.ok) return { ok: false, json: null, err: r.stderr || r.stdout };
  try {
    return { ok: true, json: JSON.parse(r.stdout || "null"), err: "" };
  } catch {
    return { ok: false, json: null, err: "invalid aws json" };
  }
}

export function defaultBackendNames(accountId, region = "us-east-1") {
  return {
    bucket: `lattice-tfstate-${accountId}`,
    dynamodb_table: "lattice-tfstate-locks",
    region,
  };
}

function hasLocalState(tfDir) {
  return (
    existsSync(join(tfDir, "terraform.tfstate")) || existsSync(join(tfDir, ".terraform", "terraform.tfstate"))
  );
}

function ensureBucket(cfg) {
  const head = awsJson(["s3api", "head-bucket", "--bucket", cfg.bucket], cfg.region);
  if (!head.ok) {
    console.log(`→ create bucket ${cfg.bucket}`);
    const createArgs = ["s3api", "create-bucket", "--bucket", cfg.bucket];
    if (cfg.region !== "us-east-1") {
      createArgs.push("--create-bucket-configuration", `LocationConstraint=${cfg.region}`);
    }
    run("aws", ["--region", cfg.region, ...createArgs]);
  } else {
    console.log(`→ bucket ${cfg.bucket}: present`);
  }
  run("aws", [
    "--region",
    cfg.region,
    "s3api",
    "put-public-access-block",
    "--bucket",
    cfg.bucket,
    "--public-access-block-configuration",
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true",
  ]);
  run("aws", [
    "--region",
    cfg.region,
    "s3api",
    "put-bucket-encryption",
    "--bucket",
    cfg.bucket,
    "--server-side-encryption-configuration",
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}',
  ]);
  run("aws", [
    "--region",
    cfg.region,
    "s3api",
    "put-bucket-versioning",
    "--bucket",
    cfg.bucket,
    "--versioning-configuration",
    "Status=Enabled",
  ]);
}

function ensureLockTable(cfg) {
  const desc = awsJson(["dynamodb", "describe-table", "--table-name", cfg.dynamodb_table], cfg.region);
  if (desc.ok) {
    console.log(`→ lock table ${cfg.dynamodb_table}: present`);
    return;
  }
  console.log(`→ create lock table ${cfg.dynamodb_table}`);
  run("aws", [
    "--region",
    cfg.region,
    "dynamodb",
    "create-table",
    "--table-name",
    cfg.dynamodb_table,
    "--attribute-definitions",
    "AttributeName=LockID,AttributeType=S",
    "--key-schema",
    "AttributeName=LockID,KeyType=HASH",
    "--billing-mode",
    "PAY_PER_REQUEST",
  ]);
  run("aws", [
    "--region",
    cfg.region,
    "dynamodb",
    "wait",
    "table-exists",
    "--table-name",
    cfg.dynamodb_table,
  ]);
}

function writeConfig(cfg) {
  const path = terraformBackendConfigPath(root);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(cfg, null, 2)}\n`);
  console.log("→ wrote .lattice/terraform-backend.json (not a secret; gitignored)");
}

function migrateStack(stack) {
  const tfDir = join(root, "infra/terraform", stack.rel);
  if (!existsSync(join(tfDir, "versions.tf"))) {
    console.log(`→ skip ${stack.id} (no versions.tf)`);
    return;
  }
  if (!hasLocalState(tfDir)) {
    console.log(`→ skip ${stack.id} migrate (no local terraform.tfstate)`);
    return;
  }
  console.log(`→ terraform init -migrate-state (${stack.id})\n`);
  const args = terraformInitArgs(root, stack.rel);
  run("terraform", [...args, "-migrate-state", "-force-copy"]);
}

export function verifyRemoteState(rootDir = root) {
  const cfg = readTerraformBackend(rootDir);
  if (!cfg) {
    console.error("No .lattice/terraform-backend.json — run npm run terraform:state first.");
    return 1;
  }
  const slug = readAppSlug(rootDir);
  const bucket = inspectStateBucket(rootDir, cfg);
  let failed = 0;
  if (bucket.versioning) console.log("  ok     s3 versioning — Enabled");
  else {
    console.log("  fail   s3 versioning");
    failed += 1;
  }
  if (bucket.encrypted) console.log("  ok     s3 encryption");
  else {
    console.log("  fail   s3 encryption");
    failed += 1;
  }
  if (bucket.publicBlocked) console.log("  ok     s3 public access blocked");
  else {
    console.log("  fail   s3 public access blocked");
    failed += 1;
  }
  for (const stack of TF_BACKEND_STACKS) {
    const key = stateObjectKey(slug, stack.id);
    const obj = inspectStateObject(rootDir, cfg, key);
    if (!obj.ok) {
      console.log(`  fail   ${key} — ${obj.err || "unreadable"}`);
      failed += 1;
      continue;
    }
    const listed = remoteStateResourceCount(rootDir, stack.rel);
    if (!listed.ok) {
      console.log(`  fail   ${key} — ${obj.bytes} bytes but terraform state list is empty`);
      failed += 1;
      continue;
    }
    console.log(`  ok     ${key} — ${obj.bytes} bytes, ${listed.count} resources (S3 readable)`);
  }
  return failed;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(HELP);
    return;
  }
  const verifyOnly = args.includes("--verify");
  const rest = args.filter((a) => a !== "--verify");
  if (rest.length) {
    console.error(`Unknown argument: ${rest[0]}`);
    process.exit(1);
  }
  if (verifyOnly) {
    console.log("→ terraform:state --verify\n");
    const failed = verifyRemoteState(root);
    if (failed) {
      console.log(`\n${failed} fail — backup is not readable from S3.`);
      process.exit(1);
    }
    console.log("\nS3 state is readable. No state JSON printed.");
    return;
  }

  readAppSlug(root);
  const ident = awsJson(["sts", "get-caller-identity"]);
  const account = ident.json?.Account;
  if (!ident.ok || !account) {
    console.error(ident.err || "aws sts get-caller-identity failed");
    process.exit(1);
  }
  const existing = readTerraformBackend(root);
  const cfg = existing || defaultBackendNames(account);
  if (existing) console.log(`→ reuse ${cfg.bucket}`);
  else writeConfig(cfg);

  ensureBucket(cfg);
  ensureLockTable(cfg);
  if (!readTerraformBackend(root)) writeConfig(cfg);

  const slug = readAppSlug(root);
  for (const stack of TF_BACKEND_STACKS) {
    console.log(`→ state key ${stateObjectKey(slug, stack.id)}`);
    migrateStack(stack);
  }
  console.log("\nLaptop apply now uses S3 state when .lattice/terraform-backend.json exists.");
  console.log("Keep the GHA deploy role off this bucket.");
  console.log("\n→ verify\n");
  const failed = verifyRemoteState(root);
  if (failed) {
    console.log(`\n${failed} fail — re-run npm run terraform:state -- --verify`);
    process.exit(1);
  }
  console.log("\nS3 state is readable. No state JSON printed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
