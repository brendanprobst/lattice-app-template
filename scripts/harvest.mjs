#!/usr/bin/env node
/**
 * Lattice harvest CLI — index platform utilities from a child app into a harvest doc.
 *
 *   npm run harvest -- --from ../fosterfolio
 *   npm run harvest -- index --from ../fosterfolio --focus profile,styling,components
 *   npm run harvest -- help
 *
 * See docs/playbooks/upstream-harvest.md
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHarvestIndexArgs, runHarvestIndex } from "./lattice-harvest-index.mjs";

export const HARVEST_COMMANDS = ["index", "help"];

export function harvestHelp() {
  return `Lattice harvest — pull app-agnostic utilities from a child app into the template index.

Usage:
  npm run harvest -- [--from <child-app>] [options]
  npm run harvest -- index --from <child-app> [options]
  npm run harvest -- help

Commands:
  index     Write harvest-<date>-<app>.md SCRIPT sections (default)
  help      Show this help

Options:
  --from <path>              Child app repo (required for index)
  --spawn-name <name>        Filename segment (default: folder basename)
  --out <file.md>            Override output path
  --focus <csv>              Utility scopes to highlight (profile,styling,components,docs)
  --utility <csv>            Alias for --focus
  --include-segment <seg>    Treat a product-excluded segment as harvestable (repeatable)
  --dry-run                  Print the harvest doc to stdout

Examples:
  npm run harvest -- --from ../fosterfolio --focus profile,styling,components
  npm run harvest -- index --from ../runout --dry-run
`;
}

export function parseHarvestCli(argv) {
  const args = argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args[0] === "help") {
    return { cmd: "help", opts: {} };
  }
  let cmd = "index";
  let rest = args;
  if (args[0] && !args[0].startsWith("-")) {
    cmd = args[0];
    rest = args.slice(1);
  }
  if (!HARVEST_COMMANDS.includes(cmd)) {
    throw new Error(`Unknown harvest command: ${cmd}\n\n${harvestHelp()}`);
  }
  const opts = parseHarvestIndexArgs(["node", "harvest", ...rest], { requireFrom: true });
  return { cmd, opts };
}

export function runHarvestCli(argv = process.argv) {
  const { cmd, opts } = parseHarvestCli(argv);
  if (cmd === "help") {
    console.log(harvestHelp());
    return { cmd };
  }
  return runHarvestIndex(opts);
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (invokedDirectly) {
  try {
    runHarvestCli(process.argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
