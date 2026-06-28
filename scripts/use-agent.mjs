#!/usr/bin/env node
/**
 * Switch between Claude Code and Cursor agent configurations.
 *
 *   npm run use:claude   — generate CLAUDE.md files from agents/prompts/; remove .mdc files
 *   npm run use:cursor   — generate .cursor/rules/*.mdc from agents/prompts/; remove CLAUDE.md files
 *   npm run agents:sync  — generate both (for teams using both tools simultaneously)
 *   npm run agent:status — show which mode is currently active
 *
 * Source of truth: agents/prompts/<id>.md
 * Edit expert content there, then re-run the appropriate command to regenerate.
 *
 * Generated files are committed to git — both Cursor and Claude configs can coexist in
 * git history. Switching is always reversible by re-running the generate command.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ─── Agent definitions (mirrors agents/prompts/registry.yaml) ────────────────

const PATH_AGENTS = [
  {
    id: "ddd-expert",
    prompt: "agents/prompts/ddd-expert.md",
    description: "DDD expert — domain & application layers (auto when editing domain/use-case files)",
    globs: ["apps/api/domain/**", "apps/api/application/**", "docs/adr/**"],
  },
  {
    id: "test-expert",
    prompt: "agents/prompts/test-expert.md",
    description: "Test expert — Jest & integration tests (auto when editing tests or feature code under apps/)",
    globs: ["test/api/**", "test/web/**", "test/AGENTS.md", "apps/api/**", "apps/web/client/**", "apps/web/app/**"],
  },
  {
    id: "infra-expert",
    prompt: "agents/prompts/infra-expert.md",
    description: "Infra expert — adapters, composition root, config, seed (auto when editing infra/config)",
    globs: ["apps/api/infrastructure/**", "apps/api/config/**", "apps/web/client/lib/**", "seed.json"],
  },
];

const GLOBAL_AGENTS = [
  {
    id: "debugger-expert",
    prompt: "agents/prompts/debugger-expert.md",
    description: "Debugger expert — attach with @Rules when investigating failures, flakes, or production errors",
    command: "debug",
  },
  {
    id: "code-janitor",
    prompt: "agents/prompts/code-janitor.md",
    description: "Code janitor — attach with @Rules for audits, cleanup PRs, consistency, and hygiene",
    command: "janitor",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readPrompt(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) {
    console.error(`\nError: prompt file not found: ${relPath}`);
    console.error("Remove the agent from PATH_AGENTS/GLOBAL_AGENTS in scripts/use-agent.mjs first, then delete the prompt.\n");
    process.exit(1);
  }
  return readFileSync(abs, "utf8");
}

function writeFile(relPath, content) {
  const abs = join(ROOT, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
  console.log(`  + ${relPath}`);
}

function removeFile(relPath) {
  const abs = join(ROOT, relPath);
  if (existsSync(abs)) {
    unlinkSync(abs);
    console.log(`  - ${relPath}`);
  }
}

// Derive target directories for CLAUDE.md from globs (skip file-only entries like seed.json)
function dirsFromGlobs(globs) {
  return globs.filter((g) => g.endsWith("/**")).map((g) => g.slice(0, -3));
}

// Build .mdc frontmatter from agent metadata
function mdcFrontmatter(agent) {
  const lines = ["---", `description: ${agent.description}`];
  if (agent.globs && agent.globs.length) {
    lines.push("globs:");
    for (const g of agent.globs) lines.push(`  - "${g}"`);
  }
  lines.push("alwaysApply: false", "---", "");
  return lines.join("\n");
}

// ─── All generated file paths (for status checks) ────────────────────────────

function claudePaths() {
  const paths = ["CLAUDE.md"];
  for (const a of PATH_AGENTS) {
    for (const dir of dirsFromGlobs(a.globs)) paths.push(`${dir}/CLAUDE.md`);
  }
  for (const a of GLOBAL_AGENTS) paths.push(`.claude/commands/${a.command}.md`);
  return paths;
}

function cursorPaths() {
  return [...PATH_AGENTS, ...GLOBAL_AGENTS].map((a) => `.cursor/rules/${a.id}.mdc`);
}

// ─── Root CLAUDE.md ──────────────────────────────────────────────────────────

function rootClaudeContent() {
  return `# Claude agent mode

> Full project context: see \`AGENTS.md\` (monorepo layout, CI, conventions).

## Expert context (auto-loaded by directory)

Claude Code reads the \`CLAUDE.md\` closest to the file you're editing, loading expert
guidance automatically as you navigate the project:

| Directory | Expert loaded |
|-----------|---------------|
| \`apps/api/domain/\`, \`apps/api/application/\`, \`docs/adr/\` | DDD expert |
| \`apps/api/\`, \`apps/web/client/\`, \`apps/web/app/\`, \`test/api/\`, \`test/web/\` | Test expert (tests-first) |
| \`apps/api/infrastructure/\`, \`apps/api/config/\`, \`apps/web/client/lib/\` | Infrastructure expert |

## Slash commands (global experts)

Type \`/\` in Claude Code to attach a global expert:

| Command | Use when |
|---------|----------|
| \`/debug\` | Investigating failures, flakes, or non-obvious errors |
| \`/janitor\` | Consistency audits, dead code, dependency hygiene |

---
_Managed by \`npm run use:claude\` / \`npm run agents:sync\`._
_Edit expert content in \`agents/prompts/*.md\`, then re-run to sync._
`;
}

// ─── Generate Claude artifacts ────────────────────────────────────────────────

function generateClaude() {
  writeFile("CLAUDE.md", rootClaudeContent());
  for (const agent of PATH_AGENTS) {
    const body = readPrompt(agent.prompt);
    for (const dir of dirsFromGlobs(agent.globs)) writeFile(`${dir}/CLAUDE.md`, body);
  }
  for (const agent of GLOBAL_AGENTS) {
    writeFile(`.claude/commands/${agent.command}.md`, readPrompt(agent.prompt));
  }
}

// ─── Generate Cursor artifacts ────────────────────────────────────────────────

function generateCursor() {
  for (const agent of [...PATH_AGENTS, ...GLOBAL_AGENTS]) {
    const body = readPrompt(agent.prompt);
    writeFile(`.cursor/rules/${agent.id}.mdc`, mdcFrontmatter(agent) + body);
  }
}

// ─── Remove Claude artifacts ──────────────────────────────────────────────────

function removeClaude() {
  for (const p of claudePaths()) removeFile(p);
}

// ─── Remove Cursor artifacts ──────────────────────────────────────────────────

function removeCursor() {
  for (const p of cursorPaths()) removeFile(p);
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function useClaude() {
  console.log("Switching to Claude agent mode…\n");
  generateClaude();
  console.log();
  removeCursor();
  console.log(`
Claude agent mode active.

Stage and commit to record in git history:
  git add -A
  git commit -m "chore: activate Claude agent mode"

Edit expert content in agents/prompts/*.md, then re-run npm run use:claude to sync.
Switch back: npm run use:cursor
`);
}

function useCursor() {
  console.log("Switching to Cursor agent mode…\n");
  generateCursor();
  console.log();
  removeClaude();
  console.log(`
Cursor agent mode active.

Stage and commit to record in git history:
  git add -A
  git commit -m "chore: activate Cursor agent mode"

Edit expert content in agents/prompts/*.md, then re-run npm run use:cursor to sync.
Switch back: npm run use:claude
`);
}

function sync() {
  console.log("Syncing all agent configs…\n");
  generateClaude();
  console.log();
  generateCursor();
  console.log(`
Both Claude and Cursor configs are up to date.

Stage and commit to record in git history:
  git add -A
  git commit -m "chore: sync agent configs"
`);
}

function status() {
  const claudeActive = existsSync(join(ROOT, "CLAUDE.md"));
  const cursorActive = existsSync(join(ROOT, ".cursor/rules/ddd-expert.mdc"));

  if (claudeActive && cursorActive) {
    console.log("Agent mode: synced (both Claude and Cursor configs present)");
  } else if (claudeActive) {
    console.log("Agent mode: claude");
  } else if (cursorActive) {
    console.log("Agent mode: cursor");
  } else {
    console.log("Agent mode: none — run npm run use:claude or npm run use:cursor");
    return;
  }

  if (claudeActive) {
    const missing = claudePaths().filter((p) => !existsSync(join(ROOT, p)));
    if (missing.length) console.log(`  Claude: ${missing.length} file(s) missing — re-run npm run use:claude`);
  }
  if (cursorActive) {
    const missing = cursorPaths().filter((p) => !existsSync(join(ROOT, p)));
    if (missing.length) console.log(`  Cursor: ${missing.length} file(s) missing — re-run npm run use:cursor`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const cmd = process.argv[2];
if (cmd === "claude") useClaude();
else if (cmd === "cursor") useCursor();
else if (cmd === "sync") sync();
else if (cmd === "status") status();
else {
  console.error("Usage: npm run use:claude | npm run use:cursor | npm run agents:sync | npm run agent:status");
  process.exit(1);
}
