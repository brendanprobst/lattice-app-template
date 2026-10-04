import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaultBackendNames,
} from "../../scripts/terraform-remote-state.mjs";
import {
  readTerraformBackend,
  stateObjectKey,
  stackIdFromRel,
  summarizeStateHead,
  terraformInitArgs,
} from "../../scripts/terraform-backend.mjs";

test("summarizeStateHead rejects empty objects", () => {
  assert.equal(summarizeStateHead({ ContentLength: 0 }).readable, false);
  assert.equal(summarizeStateHead({ ContentLength: 4096 }).readable, true);
});

test("stateObjectKey namespaces by app and stack", () => {
  assert.equal(stateObjectKey("lattice-smoke-test", "dev"), "lattice-smoke-test/dev/terraform.tfstate");
  assert.equal(stackIdFromRel("envs/prod"), "prod");
  assert.equal(stackIdFromRel("dns-zone"), "dns-zone");
});

test("defaultBackendNames uses account id", () => {
  assert.deepEqual(defaultBackendNames("537124980154"), {
    bucket: "lattice-tfstate-537124980154",
    dynamodb_table: "lattice-tfstate-locks",
    region: "us-east-1",
  });
});

test("terraformInitArgs stays local without backend json", () => {
  const dir = mkdtempSync(join(tmpdir(), "lattice-tf-"));
  const args = terraformInitArgs(dir, "envs/dev");
  assert.ok(args.includes("-backend=false"));
});

test("terraformInitArgs uses S3 when backend json exists", () => {
  const dir = mkdtempSync(join(tmpdir(), "lattice-tf-"));
  mkdirSync(join(dir, ".lattice"));
  writeFileSync(
    join(dir, ".lattice", "terraform-backend.json"),
    JSON.stringify({
      bucket: "lattice-tfstate-1",
      dynamodb_table: "lattice-tfstate-locks",
      region: "us-east-1",
    }),
  );
  writeFileSync(join(dir, ".lattice", "infisical.json"), JSON.stringify({ appSlug: "demo-app" }));
  const args = terraformInitArgs(dir, "envs/dev");
  assert.ok(!args.includes("-backend=false"));
  assert.ok(args.some((a) => a.includes("key=demo-app/dev/terraform.tfstate")));
  assert.equal(readTerraformBackend(dir).bucket, "lattice-tfstate-1");
});
