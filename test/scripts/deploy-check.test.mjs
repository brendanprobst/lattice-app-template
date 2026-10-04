import assert from "node:assert/strict";
import { test } from "node:test";
import {
  apiRootLooksHealthy,
  classifySiteResponse,
  corsHasLocalhost,
  parseCheckArgs,
  readTfvarsString,
  stackRegion,
  dnsParentName,
} from "../../scripts/deploy-check.mjs";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("corsHasLocalhost flags loopback only", () => {
  assert.equal(corsHasLocalhost("https://lattice.brendanprobst.com"), false);
  assert.equal(corsHasLocalhost("https://dxxx.cloudfront.net,http://localhost:3001"), true);
  assert.equal(corsHasLocalhost("http://127.0.0.1:3001"), true);
});

test("classifySiteResponse treats empty CloudFront as a pre-deploy gap", () => {
  assert.equal(classifySiteResponse(200, "<!doctype html><html>"), "ok");
  assert.equal(classifySiteResponse(403, "AccessDenied"), "empty");
  assert.equal(classifySiteResponse(404, "NoSuchKey"), "empty");
  assert.equal(classifySiteResponse(0, ""), "unreachable");
});

test("stackRegion prefers execute-api host over the CLI default", () => {
  assert.equal(
    stackRegion({ apiUrl: "https://p053q54xs2.execute-api.us-east-1.amazonaws.com" }),
    "us-east-1",
  );
});

test("apiRootLooksHealthy accepts spawn branding", () => {
  assert.equal(apiRootLooksHealthy(200, '{"message":"Lattice App Smoke Test API"}'), true);
  assert.equal(apiRootLooksHealthy(200, "<html>nope</html>"), false);
  assert.equal(apiRootLooksHealthy(500, "{}"), false);
});

test("parseCheckArgs requires --env", () => {
  assert.equal(parseCheckArgs(["node", "x", "--help"]).help, true);
  assert.equal(parseCheckArgs(["node", "x", "--env", "prod"]).env, "prod");
});

test("dnsParentName uses the zone for a dev hostname", () => {
  assert.equal(dnsParentName("dev.lattice.brendanprobst.com"), "lattice.brendanprobst.com");
  assert.equal(dnsParentName("lattice.brendanprobst.com"), "");
});

test("readTfvarsString reads supabase_url without printing", () => {
  const path = join(tmpdir(), `lattice-tfvars-${process.pid}.tfvars`);
  writeFileSync(path, 'supabase_url = "https://abcd.supabase.co"\naws_region = "us-east-1"\n');
  assert.equal(readTfvarsString(path, "supabase_url"), "https://abcd.supabase.co");
  assert.equal(readTfvarsString(path, "missing"), "");
});
