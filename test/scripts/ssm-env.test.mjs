import assert from "node:assert/strict";
import { test } from "node:test";
import {
  expectedSsmNames,
  parseSsmEnvArgs,
  ssmNameToEnvKey,
  ssmSuffix,
} from "../../scripts/ssm-env.mjs";

test("expectedSsmNames groups supabase keys under the env prefix", () => {
  assert.deepEqual(expectedSsmNames("/lattice-app-smoke-test-prod"), [
    "/lattice-app-smoke-test-prod/supabase/url",
    "/lattice-app-smoke-test-prod/supabase/anon_key",
    "/lattice-app-smoke-test-prod/supabase/service_role_key",
  ]);
});

test("ssmNameToEnvKey maps suffixes for shell export", () => {
  const prefix = "/app-dev";
  assert.equal(ssmNameToEnvKey("/app-dev/supabase/url", prefix), "SUPABASE_URL");
  assert.equal(ssmNameToEnvKey("/app-dev/supabase/service_role_key", prefix), "SUPABASE_SERVICE_ROLE_KEY");
  assert.equal(ssmSuffix("/app-dev/supabase/anon_key", prefix), "supabase/anon_key");
});

test("parseSsmEnvArgs requires --env", () => {
  assert.equal(parseSsmEnvArgs(["node", "x", "--help"]).help, true);
  assert.equal(parseSsmEnvArgs(["node", "x", "--env", "prod", "--names"]).names, true);
});
