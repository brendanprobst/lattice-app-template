/**
 * Which agent configs a repo currently has generated (see scripts/use-agent.mjs).
 *
 *   "claude" — generated root CLAUDE.md only
 *   "cursor" — .cursor/rules/*.mdc only
 *   "synced" — both (npm run agents:sync)
 *   "none"   — neither
 *
 * A hand-written root CLAUDE.md (no generated footer) does not count as Claude mode.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Footer text every generated root CLAUDE.md carries. */
export const CLAUDE_MARKER = "_Managed by `npm run use:claude`";

export function isGeneratedClaudeMd(root) {
  const path = join(root, "CLAUDE.md");
  return existsSync(path) && readFileSync(path, "utf8").includes(CLAUDE_MARKER);
}

export function detectAgentMode(root) {
  const claude = isGeneratedClaudeMd(root);
  const cursor = existsSync(join(root, ".cursor/rules/ddd-expert.mdc"));
  if (claude && cursor) return "synced";
  if (claude) return "claude";
  if (cursor) return "cursor";
  return "none";
}
