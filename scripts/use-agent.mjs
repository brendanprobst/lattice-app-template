#!/usr/bin/env node
/**
 * Switch between Claude Code and Cursor agent configurations.
 *
 *   npm run use:claude   — generate CLAUDE.md, .claude/{rules,commands,skills}, .mcp.json; remove .cursor/rules
 *   npm run use:cursor   — generate .cursor/rules/*.mdc (+ README); remove the Claude files above
 *   npm run agents:sync  — generate both (for teams using both tools simultaneously)
 *   npm run agent:status — show which mode is currently active
 *
 * Source of truth:
 *   agents/prompts/<id>.md          — expert personas (both tools)
 *   .cursor/skills/<name>/          — skills, mirrored to .claude/skills/<name>/
 *   .cursor/mcp.json                — MCP servers, converted to .mcp.json
 * Edit there, then re-run the appropriate command to regenerate.
 *
 * Generated files are committed to git — both Cursor and Claude configs can coexist in
 * git history. Switching is always reversible by re-running the generate command.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { detectAgentMode, isGeneratedClaudeMd } from "./agent-mode.mjs";
import { isMainModule } from "./is-main-module.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ─── Agent definitions (mirrors agents/prompts/registry.yaml) ────────────────

export const PATH_AGENTS = [
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
  {
    id: "harvest-expert",
    prompt: "agents/prompts/harvest-expert.md",
    description: "Harvest expert — analyze/integrate child-app → template (auto on harvest docs and scripts)",
    globs: [
      "docs/playbooks/upstream-harvest.md",
      "docs/playbooks/template-growth.md",
      "docs/research/harvests/**",
      "scripts/harvest.mjs",
      "scripts/lattice-harvest*.mjs",
      ".lattice/harvest.json.example",
    ],
  },
];

const ALWAYS_APPLY_AGENTS = [
  {
    id: "template-growth",
    prompt: "agents/prompts/template-growth.md",
    description:
      "Template growth — kernel vs capability vs catalog. Always on. Highest priority for template surface changes.",
    alwaysApply: true,
  },
];

export const GLOBAL_AGENTS = [
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

function readPrompt(root, relPath) {
  const abs = join(root, relPath);
  if (!existsSync(abs)) {
    throw new Error(
      `prompt file not found: ${relPath}\n` +
        "Remove the agent from PATH_AGENTS/GLOBAL_AGENTS in scripts/use-agent.mjs first, then delete the prompt.",
    );
  }
  return readFileSync(abs, "utf8");
}

function writeFile(root, relPath, content, log) {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
  log(`  + ${relPath}`);
}

function removePath(root, relPath, log) {
  const abs = join(root, relPath);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
    log(`  - ${relPath}`);
  }
}

// Derive target directories for CLAUDE.md from globs (skip file-only entries like seed.json)
export function dirsFromGlobs(globs) {
  return globs.filter((g) => g.endsWith("/**")).map((g) => g.slice(0, -3));
}

// Globs a directory CLAUDE.md can't express (single files, wildcards) — emitted as a
// path-scoped .claude/rules/<id>.md instead
export function fileGlobs(globs) {
  return globs.filter((g) => !g.endsWith("/**"));
}

// Short display name: "DDD expert — domain & …" → "DDD expert"
function shortName(agent) {
  return agent.description.split(" — ")[0];
}

// ─── Cursor-native sources mirrored into Claude ──────────────────────────────

const CURSOR_SKILLS_DIR = ".cursor/skills";
const CURSOR_MCP = ".cursor/mcp.json";

function skillNames(root) {
  const abs = join(root, CURSOR_SKILLS_DIR);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(abs, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

/**
 * Mark a mirrored SKILL.md as generated, after its frontmatter so the YAML stays first.
 * An agent editing the Claude copy reads this and edits the .cursor/ source instead.
 */
export function withGeneratedNotice(skillMd, name) {
  const notice = `<!-- Generated from .cursor/skills/${name}/ by npm run use:claude. Edit that copy; this one is overwritten on every sync. -->\n`;
  const end = skillMd.startsWith("---\n") ? skillMd.indexOf("\n---\n", 4) : -1;
  if (end === -1) return notice + skillMd;
  const split = end + "\n---\n".length;
  return `${skillMd.slice(0, split)}${notice}${skillMd.slice(split)}`;
}

// Cursor writes `${env:VAR}` and infers HTTP from `url`; Claude wants `${VAR}` and an explicit type
export function claudeMcpContent(cursorJson) {
  const cursor = JSON.parse(cursorJson);
  const mcpServers = {};
  for (const [name, server] of Object.entries(cursor.mcpServers ?? {})) {
    mcpServers[name] = server.url && !server.type ? { type: "http", ...server } : server;
  }
  return JSON.stringify({ mcpServers }, null, 2).replace(/\$\{env:(\w+)\}/g, "${$1}") + "\n";
}

// Build .mdc frontmatter from agent metadata
function mdcFrontmatter(agent) {
  const lines = ["---", `description: ${agent.description}`];
  if (agent.globs && agent.globs.length) {
    lines.push("globs:");
    for (const g of agent.globs) lines.push(`  - "${g}"`);
  }
  lines.push(`alwaysApply: ${agent.alwaysApply === true}`, "---", "");
  return lines.join("\n");
}

function allCursorAgents() {
  return [...ALWAYS_APPLY_AGENTS, ...PATH_AGENTS, ...GLOBAL_AGENTS];
}

// ─── All generated file paths (for status checks) ────────────────────────────

export function claudePaths(root = ROOT) {
  const paths = ["CLAUDE.md"];
  for (const a of PATH_AGENTS) {
    for (const dir of dirsFromGlobs(a.globs)) paths.push(`${dir}/CLAUDE.md`);
    if (fileGlobs(a.globs).length) paths.push(`.claude/rules/${a.id}.md`);
  }
  for (const a of GLOBAL_AGENTS) paths.push(`.claude/commands/${a.command}.md`);
  for (const name of skillNames(root)) paths.push(`.claude/skills/${name}`);
  if (existsSync(join(root, CURSOR_MCP))) paths.push(".mcp.json");
  return paths;
}

export function cursorPaths() {
  return [...allCursorAgents().map((a) => `.cursor/rules/${a.id}.mdc`), ".cursor/rules/README.md"];
}

// ─── Root CLAUDE.md ──────────────────────────────────────────────────────────

function fileScopedSection() {
  const rows = PATH_AGENTS.filter((a) => fileGlobs(a.globs).length).map(
    (a) => `| ${fileGlobs(a.globs).map((g) => `\`${g}\``).join(", ")} | ${shortName(a)} (\`.claude/rules/${a.id}.md\`) |`,
  );
  if (!rows.length) return "";
  return `
Single-file globs load from \`.claude/rules/\` when Claude reads a matching file:

| Files | Expert loaded |
|-------|---------------|
${rows.join("\n")}
`;
}

function mirroredSection(root) {
  const skills = skillNames(root);
  const hasMcp = existsSync(join(root, CURSOR_MCP));
  if (!skills.length && !hasMcp) return "";
  const lines = ["", "## Skills and MCP", ""];
  if (skills.length) {
    lines.push(
      `Project skills (${skills.map((s) => `\`${s}\``).join(", ")}) are mirrored from \`.cursor/skills/\` into \`.claude/skills/\`.`,
    );
  }
  if (hasMcp) lines.push("MCP servers in `.mcp.json` are converted from `.cursor/mcp.json`.");
  lines.push("Edit the `.cursor/` sources, not the Claude copies — they are overwritten on every sync.", "");
  return lines.join("\n");
}

export function rootClaudeContent(root = ROOT) {
  return `# Claude agent mode

> Full project context: see \`AGENTS.md\` (monorepo layout, CI, conventions).

## Template growth (always on — highest priority)

${readPrompt(root, "agents/prompts/template-growth.md")}

## Expert context (auto-loaded by directory)

Claude Code reads the \`CLAUDE.md\` closest to the file you're editing, loading expert
guidance automatically as you navigate the project:

| Directory | Expert loaded |
|-----------|---------------|
| \`apps/api/domain/\`, \`apps/api/application/\`, \`docs/adr/\` | DDD expert |
| \`apps/api/\`, \`apps/web/client/\`, \`apps/web/app/\`, \`test/api/\`, \`test/web/\` | Test expert (tests-first) |
| \`apps/api/infrastructure/\`, \`apps/api/config/\`, \`apps/web/client/lib/\` | Infrastructure expert |
| \`docs/research/harvests/\` | Harvest expert |
${fileScopedSection()}
## Slash commands (global experts)

Type \`/\` in Claude Code to attach a global expert:

| Command | Use when |
|---------|----------|
| \`/debug\` | Investigating failures, flakes, or non-obvious errors |
| \`/janitor\` | Consistency audits, dead code, dependency hygiene |
${mirroredSection(root)}
---
_Managed by \`npm run use:claude\` / \`npm run agents:sync\`._
_Edit expert content in \`agents/prompts/*.md\`, then re-run to sync._
`;
}

// ─── Generate Claude artifacts ────────────────────────────────────────────────

/** A root CLAUDE.md without the generated footer belongs to a person; never overwrite or delete it. */
function handWrittenClaudeMd(root) {
  return existsSync(join(root, "CLAUDE.md")) && !isGeneratedClaudeMd(root);
}

export function generateClaude(root = ROOT, { log = console.log } = {}) {
  if (handWrittenClaudeMd(root)) {
    throw new Error(
      "CLAUDE.md at the repo root is hand-written (no generated footer), so use:claude will not overwrite it.\n" +
        "Move its content into AGENTS.md or agents/prompts/*.md, delete CLAUDE.md, then re-run.",
    );
  }
  writeFile(root, "CLAUDE.md", rootClaudeContent(root), log);
  for (const agent of PATH_AGENTS) {
    const body = readPrompt(root, agent.prompt);
    for (const dir of dirsFromGlobs(agent.globs)) writeFile(root, `${dir}/CLAUDE.md`, body, log);
    const files = fileGlobs(agent.globs);
    if (files.length) {
      const frontmatter = ["---", "paths:", ...files.map((g) => `  - "${g}"`), "---", ""].join("\n");
      writeFile(root, `.claude/rules/${agent.id}.md`, frontmatter + body, log);
    }
  }
  for (const agent of GLOBAL_AGENTS) {
    writeFile(root, `.claude/commands/${agent.command}.md`, readPrompt(root, agent.prompt), log);
  }
  for (const name of skillNames(root)) {
    const dest = `.claude/skills/${name}`;
    rmSync(join(root, dest), { recursive: true, force: true });
    cpSync(join(root, CURSOR_SKILLS_DIR, name), join(root, dest), { recursive: true });
    const skillMd = join(root, dest, "SKILL.md");
    writeFileSync(skillMd, withGeneratedNotice(readFileSync(skillMd, "utf8"), name), "utf8");
    log(`  + ${dest}/`);
  }
  if (existsSync(join(root, CURSOR_MCP))) {
    writeFile(root, ".mcp.json", claudeMcpContent(readFileSync(join(root, CURSOR_MCP), "utf8")), log);
  }
}

// ─── Generate Cursor artifacts ────────────────────────────────────────────────

export function generateCursor(root = ROOT, { log = console.log } = {}) {
  for (const agent of allCursorAgents()) {
    const body = readPrompt(root, agent.prompt);
    writeFile(root, `.cursor/rules/${agent.id}.mdc`, mdcFrontmatter(agent) + body, log);
  }
  writeFile(root, ".cursor/rules/README.md", cursorReadmeContent(), log);
}

function cursorReadmeContent() {
  const code = (s) => `\`${s}\``;
  const rows = [
    ...PATH_AGENTS.map(
      (a) => `| ${code(`${a.id}.mdc`)} | ${shortName(a)} | Automatically when you work on ${a.globs.map(code).join(", ")}. |`,
    ),
    ...ALWAYS_APPLY_AGENTS.map((a) => `| ${code(`${a.id}.mdc`)} | ${shortName(a)} | **Always on** (\`alwaysApply: true\`). |`),
    ...GLOBAL_AGENTS.map(
      (a) => `| ${code(`${a.id}.mdc`)} | ${shortName(a)} | **Not** path-scoped — attach with **\`@\` → Rules**. |`,
    ),
  ];
  return `# Cursor project rules

These \`.mdc\` files define **expert personas** for this repo.

| Rule file | Expert | When it applies |
|-----------|--------|------------------|
${rows.join("\n")}

## Attaching global experts (\`@\`)

In **Chat** or **Composer**, type **\`@\`** → **Rules** (wording may be **Cursor Rules** in your build) → select the expert.

Fallback: **\`@\`** → **Files** → the matching file under \`.cursor/rules/\`.

Scoped rules still apply from file paths; \`@\` adds the global expert when you need it (e.g. debugging outside \`test/api/\`, or a janitor pass on the whole tree).

---
_Generated by \`npm run use:cursor\` / \`npm run agents:sync\` from \`agents/prompts/\` — edit there, then re-run._
`;
}

// ─── Remove Claude artifacts ──────────────────────────────────────────────────

export function removeClaude(root = ROOT, { log = console.log } = {}) {
  const keepRoot = handWrittenClaudeMd(root);
  for (const p of claudePaths(root)) {
    if (p === "CLAUDE.md" && keepRoot) {
      log("  = CLAUDE.md (hand-written, kept)");
      continue;
    }
    removePath(root, p, log);
  }
}

// ─── Remove Cursor artifacts ──────────────────────────────────────────────────

export function removeCursor(root = ROOT, { log = console.log } = {}) {
  for (const p of cursorPaths()) removePath(root, p, log);
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
  const mode = detectAgentMode(ROOT);
  const claudeActive = mode === "claude" || mode === "synced";
  const cursorActive = mode === "cursor" || mode === "synced";

  if (mode === "synced") {
    console.log("Agent mode: synced (both Claude and Cursor configs present)");
  } else if (mode === "none") {
    console.log("Agent mode: none — run npm run use:claude or npm run use:cursor");
    return;
  } else {
    console.log(`Agent mode: ${mode}`);
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

function main(cmd) {
  if (cmd === "claude") useClaude();
  else if (cmd === "cursor") useCursor();
  else if (cmd === "sync") sync();
  else if (cmd === "status") status();
  else {
    console.error("Usage: npm run use:claude | npm run use:cursor | npm run agents:sync | npm run agent:status");
    process.exit(1);
  }
}

if (isMainModule(import.meta.url)) {
  try {
    main(process.argv[2]);
  } catch (err) {
    console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}
