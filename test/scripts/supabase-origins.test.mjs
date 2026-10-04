import assert from "node:assert/strict";
import { test } from "node:test";
import {
  authLeftoverLines,
  normalizeSupabaseOrigin,
  supabaseOriginsMatch,
  supabaseProjectRef,
} from "../../scripts/supabase-origins.mjs";

test("normalizeSupabaseOrigin drops path and is case-insensitive", () => {
  assert.equal(
    normalizeSupabaseOrigin("https://Abc.supabase.co/auth/v1"),
    "https://abc.supabase.co",
  );
  assert.equal(normalizeSupabaseOrigin("not a url"), "");
});

test("supabaseOriginsMatch requires the same project origin", () => {
  assert.equal(
    supabaseOriginsMatch(
      "https://xsmjnrlknttnkksrajht.supabase.co",
      "https://xsmjnrlknttnkksrajht.supabase.co/",
    ),
    true,
  );
  assert.equal(
    supabaseOriginsMatch(
      "https://xsmjnrlknttnkksrajht.supabase.co",
      "https://otherproject.supabase.co",
    ),
    false,
  );
});

test("supabaseProjectRef reads the host label", () => {
  assert.equal(
    supabaseProjectRef("https://xsmjnrlknttnkksrajht.supabase.co"),
    "xsmjnrlknttnkksrajht",
  );
  assert.equal(supabaseProjectRef("https://example.com"), "");
});

test("authLeftoverLines names this env and the google-sso playbook", () => {
  const lines = authLeftoverLines({
    env: "prod",
    siteOrigin: "https://lattice.example.com",
    projectRef: "abcdref",
  }).join("\n");
  assert.match(lines, /prod Supabase project only/);
  assert.match(lines, /https:\/\/lattice\.example\.com\/\*\*/);
  assert.match(lines, /https:\/\/abcdref\.supabase\.co\/auth\/v1\/callback/);
  assert.match(lines, /docs\/playbooks\/google-sso\.md/);
  assert.match(lines, /deploy:check -- --env prod/);
});
