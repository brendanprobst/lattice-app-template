import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { detectAgentMode } from "../../scripts/agent-mode.mjs";
import { agentModeMismatch, planSkills, restoreSkills } from "../../scripts/refresh-spawn.mjs";

function repo(files) {
  const root = mkdtempSync(join(tmpdir(), "refresh-spawn-test-"));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  return root;
}

const CLAUDE = { "CLAUDE.md": "# claude\n\n_Managed by `npm run use:claude` / `npm run agents:sync`._\n" };
const CURSOR = { ".cursor/rules/ddd-expert.mdc": "---\n---\n" };

test("detectAgentMode reads the generated marker files", () => {
  assert.equal(detectAgentMode(repo(CLAUDE)), "claude");
  assert.equal(detectAgentMode(repo(CURSOR)), "cursor");
  assert.equal(detectAgentMode(repo({ ...CLAUDE, ...CURSOR })), "synced");
  assert.equal(detectAgentMode(repo({})), "none");
});

test("agentModeMismatch allows matching modes", () => {
  assert.equal(agentModeMismatch(repo(CLAUDE), repo(CLAUDE)), null);
  assert.equal(agentModeMismatch(repo(CURSOR), repo(CURSOR)), null);
  assert.equal(agentModeMismatch(repo({ ...CLAUDE, ...CURSOR }), repo({ ...CLAUDE, ...CURSOR })), null);
});

test("agentModeMismatch refuses any difference, including synced vs single and none", () => {
  assert.match(agentModeMismatch(repo(CLAUDE), repo(CURSOR)), /template is "claude", spawn is "cursor"/);
  assert.match(agentModeMismatch(repo(CURSOR), repo(CLAUDE)), /template is "cursor", spawn is "claude"/);
  assert.match(agentModeMismatch(repo({ ...CLAUDE, ...CURSOR }), repo(CLAUDE)), /"synced".*"claude"/);
  assert.match(agentModeMismatch(repo(CLAUDE), repo({})), /spawn is "none"/);
});

test("planSkills keeps every spawn skill and adds only template skills the spawn lacks", () => {
  const template = repo({
    ".cursor/skills/shared/SKILL.md": "template v2",
    ".claude/skills/shared/SKILL.md": "template v2",
    ".cursor/skills/same/SKILL.md": "same",
    ".cursor/skills/brand-new/SKILL.md": "new",
    ".claude/skills/brand-new/SKILL.md": "new",
  });
  const spawn = repo({
    ".cursor/skills/shared/SKILL.md": "spawn edit",
    ".cursor/skills/same/SKILL.md": "same",
    ".claude/skills/spawn-only/SKILL.md": "mine",
  });
  assert.deepEqual(planSkills(template, spawn), {
    kept: ["same", "shared", "spawn-only"],
    added: ["brand-new"],
    differs: ["shared"],
  });
});

test("planSkills flags a kept skill whose supporting files drifted", () => {
  const template = repo({ ".cursor/skills/x/SKILL.md": "a", ".cursor/skills/x/reference.md": "ref" });
  const spawn = repo({ ".cursor/skills/x/SKILL.md": "a" });
  assert.deepEqual(planSkills(template, spawn).differs, ["x"]);
});

test("restoreSkills puts back the spawn copy exactly and drops template copies of kept names", () => {
  const spawn = repo({ ".cursor/skills/shared/SKILL.md": "spawn edit" });
  const snap = repo({ ".cursor/skills/shared/SKILL.md": "spawn edit" });
  // what scaffold --force left behind: template content, an extra template file, and a Claude mirror
  writeFileSync(join(spawn, ".cursor/skills/shared/SKILL.md"), "template v2");
  writeFileSync(join(spawn, ".cursor/skills/shared/reference.md"), "template extra");
  mkdirSync(join(spawn, ".claude/skills/shared"), { recursive: true });
  writeFileSync(join(spawn, ".claude/skills/shared/SKILL.md"), "template v2");
  mkdirSync(join(spawn, ".cursor/skills/brand-new"), { recursive: true });
  writeFileSync(join(spawn, ".cursor/skills/brand-new/SKILL.md"), "new");

  restoreSkills(spawn, ["shared"], snap);

  assert.equal(readFileSync(join(spawn, ".cursor/skills/shared/SKILL.md"), "utf8"), "spawn edit");
  assert.equal(existsSync(join(spawn, ".cursor/skills/shared/reference.md")), false);
  assert.equal(existsSync(join(spawn, ".claude/skills/shared")), false);
  assert.equal(readFileSync(join(spawn, ".cursor/skills/brand-new/SKILL.md"), "utf8"), "new");
});
