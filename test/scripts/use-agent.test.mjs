import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CLAUDE_MARKER, detectAgentMode } from "../../scripts/agent-mode.mjs";
import {
  claudeMcpContent,
  claudePaths,
  cursorPaths,
  dirsFromGlobs,
  fileGlobs,
  generateClaude,
  generateCursor,
  removeClaude,
  removeCursor,
  rootClaudeContent,
  withGeneratedNotice,
} from "../../scripts/use-agent.mjs";

const repoRoot = join(import.meta.dirname, "../..");
const quiet = { log: () => {} };

/** A temp repo with the real prompts plus one skill. */
function scratchRepo(extra = {}) {
  const root = mkdtempSync(join(tmpdir(), "use-agent-test-"));
  cpSync(join(repoRoot, "agents/prompts"), join(root, "agents/prompts"), { recursive: true });
  mkdirSync(join(root, ".cursor/skills/demo"), { recursive: true });
  writeFileSync(join(root, ".cursor/skills/demo/SKILL.md"), "---\nname: demo\n---\n");
  for (const [rel, body] of Object.entries(extra)) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  return root;
}

test("globs split into directory CLAUDE.md files and path-scoped rules", () => {
  const globs = ["apps/api/infrastructure/**", "apps/web/client/lib/**", "seed.json"];
  assert.deepEqual(dirsFromGlobs(globs), ["apps/api/infrastructure", "apps/web/client/lib"]);
  assert.deepEqual(fileGlobs(globs), ["seed.json"]);
});

test("claudePaths never includes .claude/settings.json, so mode switches keep the deny rules", () => {
  const root = scratchRepo({ ".cursor/mcp.json": "{}" });
  const paths = claudePaths(root);
  assert.equal(paths.includes(".claude/settings.json"), false);
  assert.ok(paths.includes(".claude/rules/infra-expert.md"));
  assert.ok(paths.includes(".claude/skills/demo"));
  assert.ok(paths.includes(".mcp.json"));
});

test("MCP conversion rewrites ${env:VAR} and marks url servers as http", () => {
  const out = JSON.parse(
    claudeMcpContent(
      JSON.stringify({
        mcpServers: {
          remote: { url: "https://example.com/mcp", headers: { Authorization: "Bearer ${env:TOKEN}" } },
          local: { command: "node", args: ["server.js"] },
        },
      }),
    ),
  );
  assert.equal(out.mcpServers.remote.type, "http");
  assert.equal(out.mcpServers.remote.headers.Authorization, "Bearer ${TOKEN}");
  assert.equal(out.mcpServers.local.type, undefined);
});

test("mirrored skills say they are generated, after the frontmatter", () => {
  const out = withGeneratedNotice("---\nname: demo\n---\n# Demo\n", "demo");
  assert.ok(out.startsWith("---\nname: demo\n---\n<!-- Generated from .cursor/skills/demo/"));
  assert.ok(out.endsWith("-->\n# Demo\n"));
  assert.ok(withGeneratedNotice("# No frontmatter\n", "x").startsWith("<!-- Generated from .cursor/skills/x/"));

  const root = scratchRepo();
  generateClaude(root, quiet);
  assert.match(readFileSync(join(root, ".claude/skills/demo/SKILL.md"), "utf8"), /Edit that copy/);
  assert.doesNotMatch(readFileSync(join(root, ".cursor/skills/demo/SKILL.md"), "utf8"), /Generated from/);
});

test("the generated root CLAUDE.md carries the marker detectAgentMode looks for", () => {
  assert.ok(rootClaudeContent(scratchRepo()).includes(CLAUDE_MARKER));
});

test("claude → cursor → claude round trip leaves only the active tool's files", () => {
  const root = scratchRepo();
  generateClaude(root, quiet);
  removeCursor(root, quiet);
  assert.equal(detectAgentMode(root), "claude");
  for (const p of claudePaths(root)) assert.ok(existsSync(join(root, p)), p);

  generateCursor(root, quiet);
  removeClaude(root, quiet);
  assert.equal(detectAgentMode(root), "cursor");
  for (const p of claudePaths(root)) assert.equal(existsSync(join(root, p)), false, p);
  for (const p of cursorPaths()) assert.ok(existsSync(join(root, p)), p);
});

test("a hand-written root CLAUDE.md is not Claude mode and is never overwritten or deleted", () => {
  const mine = "# My notes\n";
  const root = scratchRepo({ "CLAUDE.md": mine });
  assert.equal(detectAgentMode(root), "none");
  assert.throws(() => generateClaude(root, quiet), /hand-written/);
  removeClaude(root, quiet);
  assert.equal(readFileSync(join(root, "CLAUDE.md"), "utf8"), mine);
});
