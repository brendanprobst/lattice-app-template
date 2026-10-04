/**
 * S3 backend wiring. Tracked Terraform files stay spawn-agnostic.
 * Spawn fills `.lattice/terraform-backend.json` (gitignored) via
 * `npm run terraform:state`. Deploy app / GHA must not read this bucket.
 * Never print terraform.tfstate JSON (it contains secrets).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { readAppSlug } from "./infisical-app.mjs";

export const STATE_OBJECT_MIN_BYTES = 64;

export const TF_BACKEND_STACKS = [
  { rel: "envs/dev", id: "dev" },
  { rel: "envs/prod", id: "prod" },
  { rel: "bootstrap", id: "bootstrap" },
  { rel: "dns-zone", id: "dns-zone" },
];

export function terraformBackendConfigPath(root) {
  return join(root, ".lattice", "terraform-backend.json");
}

export function stateObjectKey(appSlug, stackId) {
  return `${appSlug}/${stackId}/terraform.tfstate`;
}

export function stackIdFromRel(rel) {
  return String(rel || "").startsWith("envs/") ? rel.slice("envs/".length) : rel;
}

export function readTerraformBackend(root) {
  const path = terraformBackendConfigPath(root);
  if (!existsSync(path)) return null;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
  const bucket = String(parsed.bucket || "").trim();
  const dynamodb_table = String(parsed.dynamodb_table || "").trim();
  const region = String(parsed.region || "").trim();
  if (!bucket || !dynamodb_table || !region) return null;
  return { bucket, dynamodb_table, region };
}

export function terraformInitArgs(root, stackRel) {
  const chdir = `-chdir=${join(root, "infra/terraform", stackRel)}`;
  const cfg = readTerraformBackend(root);
  if (!cfg) return [chdir, "init", "-input=false", "-backend=false"];
  const slug = readAppSlug(root);
  const key = stateObjectKey(slug, stackIdFromRel(stackRel));
  return [
    chdir,
    "init",
    "-input=false",
    `-backend-config=bucket=${cfg.bucket}`,
    `-backend-config=key=${key}`,
    `-backend-config=region=${cfg.region}`,
    `-backend-config=dynamodb_table=${cfg.dynamodb_table}`,
    "-backend-config=encrypt=true",
  ];
}

function awsJson(root, args, region) {
  const extra = region ? ["--region", region] : [];
  const r = spawnSync("aws", [...extra, ...args, "--output", "json"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (r.error || r.status !== 0) {
    return { ok: false, json: null, err: (r.stderr || r.stdout || "").trim() };
  }
  try {
    return { ok: true, json: JSON.parse((r.stdout || "").trim() || "null"), err: "" };
  } catch {
    return { ok: false, json: null, err: "invalid aws json" };
  }
}

export function summarizeStateHead(head) {
  const bytes = Number(head?.ContentLength ?? 0);
  return { bytes, readable: Number.isFinite(bytes) && bytes >= STATE_OBJECT_MIN_BYTES };
}

export function inspectStateBucket(root, cfg) {
  const versioning = awsJson(root, ["s3api", "get-bucket-versioning", "--bucket", cfg.bucket], cfg.region);
  const encryption = awsJson(root, ["s3api", "get-bucket-encryption", "--bucket", cfg.bucket], cfg.region);
  const pab = awsJson(root, ["s3api", "get-public-access-block", "--bucket", cfg.bucket], cfg.region);
  const status = versioning.json?.Status || "";
  const sse = encryption.json?.ServerSideEncryptionConfiguration?.Rules?.[0]?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm || "";
  const block = pab.json?.PublicAccessBlockConfiguration || {};
  const publicBlocked =
    block.BlockPublicAcls &&
    block.IgnorePublicAcls &&
    block.BlockPublicPolicy &&
    block.RestrictPublicBuckets;
  return {
    versioning: status === "Enabled",
    encrypted: sse === "AES256" || sse === "aws:kms",
    publicBlocked: Boolean(publicBlocked),
    ok: status === "Enabled" && (sse === "AES256" || sse === "aws:kms") && Boolean(publicBlocked),
  };
}

export function inspectStateObject(root, cfg, key) {
  const head = awsJson(root, ["s3api", "head-object", "--bucket", cfg.bucket, "--key", key], cfg.region);
  if (!head.ok) return { ok: false, bytes: 0, err: "missing" };
  const sum = summarizeStateHead(head.json);
  return { ok: sum.readable, bytes: sum.bytes, err: sum.readable ? "" : "empty" };
}

export function remoteStateResourceCount(root, stackRel) {
  const chdir = `-chdir=${join(root, "infra/terraform", stackRel)}`;
  const r = spawnSync("terraform", [chdir, "state", "list"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (r.error || r.status !== 0) return { ok: false, count: 0 };
  const count = (r.stdout || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean).length;
  return { ok: count > 0, count };
}
