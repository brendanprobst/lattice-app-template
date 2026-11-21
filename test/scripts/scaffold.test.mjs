import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readlinkSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { copyTemplate, shouldExcludeSourcePath } from "../../scripts/scaffold.mjs";

const templateRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const excluded = (rel) => shouldExcludeSourcePath(join(templateRoot, rel));

test("scaffold skips per-user Claude Code files", () => {
  assert.equal(excluded(".claude/settings.local.json"), true);
  assert.equal(excluded("CLAUDE.local.md"), true);
  assert.equal(excluded("apps/api/CLAUDE.local.md"), true);
});

test("scaffold skips Claude Code agent worktrees", () => {
  assert.equal(excluded(".claude/worktrees"), true);
  assert.equal(excluded(".claude/worktrees/agent-x/scripts/scaffold.mjs"), true);
  assert.equal(excluded(".claude/worktreesish/file.md"), false);
});

test("scaffold still copies shared Claude Code config", () => {
  assert.equal(excluded(".claude"), false);
  assert.equal(excluded(".claude/settings.json"), false);
  assert.equal(excluded(".claude/commands/debug.md"), false);
  assert.equal(excluded(".claude/skills/sql-schema/SKILL.md"), false);
  assert.equal(excluded("CLAUDE.md"), false);
});

test("scaffold keeps its existing secret and build exclusions", () => {
  assert.equal(excluded(".env"), true);
  assert.equal(excluded("apps/api/.env.local"), true);
  assert.equal(excluded("apps/api/.env.example"), false);
  assert.equal(excluded("node_modules/x/index.js"), true);
  assert.equal(excluded("infra/terraform/envs/dev/terraform.tfvars"), true);
});

test("copyTemplate keeps relative symlinks relative", () => {
  const base = mkdtempSync(join(tmpdir(), "scaffold-links-"));
  const src = join(base, "src");
  mkdirSync(join(src, "sub"), { recursive: true });
  writeFileSync(join(src, "sub/a.sql"), "select 1;\n");
  symlinkSync("sub/a.sql", join(src, "a.sql"));
  const dst = join(base, "dst");
  copyTemplate(src, dst);
  assert.equal(readlinkSync(join(dst, "a.sql")), "sub/a.sql");
});
