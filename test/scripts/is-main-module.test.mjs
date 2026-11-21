import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { isMainModule } from "../../scripts/is-main-module.mjs";

const helperPath = join(import.meta.dirname, "../../scripts/is-main-module.mjs");

test("isMainModule is false for a path that isn't argv[1]", () => {
  const fake = `file://${join(tmpdir(), "not-the-entry.mjs")}`;
  assert.equal(isMainModule(fake), false);
});

function runCheckScript(entryPath) {
  const result = spawnSync(process.execPath, [entryPath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("isMainModule is true when a script is run directly (no symlink)", () => {
  const base = mkdtempSync(join(tmpdir(), "is-main-module-"));
  const scriptPath = join(base, "check.mjs");
  writeFileSync(
    scriptPath,
    `import { isMainModule } from ${JSON.stringify(helperPath)};\n` +
      `console.log(isMainModule(import.meta.url) ? "MAIN" : "NOT_MAIN");\n`,
  );
  assert.equal(runCheckScript(scriptPath), "MAIN");
});

test("isMainModule stays true when the script is run through a symlinked directory", () => {
  const base = mkdtempSync(join(tmpdir(), "is-main-module-"));
  const real = join(base, "real");
  mkdirSync(real, { recursive: true });
  const scriptPath = join(real, "check.mjs");
  writeFileSync(
    scriptPath,
    `import { isMainModule } from ${JSON.stringify(helperPath)};\n` +
      `console.log(isMainModule(import.meta.url) ? "MAIN" : "NOT_MAIN");\n`,
  );
  const link = join(base, "link");
  symlinkSync(real, link);

  assert.equal(runCheckScript(join(link, "check.mjs")), "MAIN");
});

test("isMainModule warns and returns false when argv[1] can't be resolved", (t) => {
  const missing = join(tmpdir(), "is-main-module-missing-entry");
  const originalEntry = process.argv[1];
  process.argv[1] = missing;
  t.after(() => {
    process.argv[1] = originalEntry;
  });
  const warn = t.mock.method(console, "warn", () => {});

  assert.equal(isMainModule(`file://${missing}`), false);
  assert.equal(warn.mock.callCount(), 1);
  assert.match(warn.mock.calls[0].arguments[0], new RegExp(missing));
});
