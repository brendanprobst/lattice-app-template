import assert from "node:assert/strict";
import { test } from "node:test";
import { harvestHelp, parseHarvestCli } from "../../scripts/harvest.mjs";
import { join } from "node:path";
import {
  defaultHarvestOutPath,
  parseHarvestIndexArgs,
  pathMatchesFocus,
  UTILITY_FOCUS_HINTS,
} from "../../scripts/lattice-harvest-index.mjs";

test("parseHarvestCli defaults to index and parses focus csv", () => {
  const { cmd, opts } = parseHarvestCli([
    "node",
    "harvest",
    "--from",
    "../fosterfolio",
    "--focus",
    "profile,styling,components",
  ]);
  assert.equal(cmd, "index");
  assert.equal(opts.from, "../fosterfolio");
  assert.deepEqual(opts.focus, ["profile", "styling", "components"]);
});

test("parseHarvestCli accepts an explicit index command", () => {
  const { cmd, opts } = parseHarvestCli([
    "node",
    "harvest",
    "index",
    "--from",
    "../fosterfolio",
    "--include-segment",
    "profiles",
  ]);
  assert.equal(cmd, "index");
  assert.deepEqual(opts.includeSegments, ["profiles"]);
});

test("parseHarvestCli help does not require --from", () => {
  assert.equal(parseHarvestCli(["node", "harvest", "help"]).cmd, "help");
  assert.equal(parseHarvestCli(["node", "harvest", "--help"]).cmd, "help");
});

test("parseHarvestCli rejects unknown commands", () => {
  assert.throws(() => parseHarvestCli(["node", "harvest", "apply", "--from", "../x"]), /Unknown harvest command/);
});

test("parseHarvestIndexArgs rejects unknown flags", () => {
  assert.throws(() => parseHarvestIndexArgs(["node", "idx", "--nope"]), /Unknown flag/);
});

test("pathMatchesFocus uses built-in utility hints", () => {
  assert.ok(UTILITY_FOCUS_HINTS.profile);
  assert.equal(pathMatchesFocus("apps/web/client/pages/profile/ProfilePage.tsx", ["profile"]), true);
  assert.equal(pathMatchesFocus("apps/web/docs/ui-and-styling.md", ["styling"]), true);
  assert.equal(pathMatchesFocus("apps/web/client/components/ui/button.tsx", ["components"]), true);
  assert.equal(pathMatchesFocus("apps/api/domain/entities/Pet.ts", ["profile"]), false);
});

test("defaultHarvestOutPath writes under docs/research/harvests in the template", () => {
  const out = defaultHarvestOutPath("fosterfolio", new Date("2026-10-05T12:00:00.000Z"));
  assert.ok(out.includes(join("docs", "research", "harvests")));
  assert.ok(out.endsWith("harvest-2026-10-05-fosterfolio.md"));
  assert.equal(out.includes(`${join("cursor", "research")}`), false);
});

test("harvestHelp names the fosterfolio-style workflow", () => {
  const text = harvestHelp();
  assert.match(text, /npm run harvest/);
  assert.match(text, /--focus/);
  assert.match(text, /--include-segment/);
  assert.match(text, /APPROVE-KERNEL/);
  assert.match(text, /APPROVE-CATALOG/);
});
