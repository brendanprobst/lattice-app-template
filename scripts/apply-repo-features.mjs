#!/usr/bin/env node
/**
 * Apply config/repo-features.json to files GitHub cannot gate from JSON alone.
 *
 * Today: Dependabot — when dependabot.enabled is false, renames .github/dependabot.yml →
 * .github/dependabot.yml.disabled (and the reverse when true).
 *
 *   npm run repo-features:apply
 *   npm run repo-features:apply -- --dry-run
 *   npm run repo-features:apply -- --print-only   # show resolved config, no writes
 */
import { existsSync, readFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, "config/repo-features.json");
const active = join(root, ".github/dependabot.yml");
const disabled = join(root, ".github/dependabot.yml.disabled");

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    printOnly: args.includes("--print-only"),
  };
}

function loadConfig() {
  if (!existsSync(configPath)) {
    return { dependabot: { enabled: true }, ci: {} };
  }
  const raw = readFileSync(configPath, "utf8");
  return JSON.parse(raw);
}

function main() {
  const { dryRun, printOnly } = parseArgs(process.argv);
  let data;
  try {
    data = loadConfig();
  } catch (e) {
    console.error(`Invalid ${configPath}:`, e.message);
    process.exit(1);
  }

  const depEnabled = data.dependabot?.enabled !== false;

  console.log("Resolved config/repo-features.json:");
  console.log(`  dependabot.enabled = ${depEnabled}`);
  console.log(`  ci.enabled         = ${data.ci?.enabled !== false}`);
  console.log(`  ci.test            = ${data.ci?.test !== false}`);
  console.log(`  ci.webE2e          = ${data.ci?.webE2e !== false}`);
  console.log(`  ci.terraform       = ${data.ci?.terraform !== false}`);
  console.log("");

  if (printOnly) return;

  const hasActive = existsSync(active);
  const hasDisabled = existsSync(disabled);

  if (hasActive && hasDisabled) {
    console.error(
      "Both .github/dependabot.yml and .github/dependabot.yml.disabled exist. Remove one and re-run.",
    );
    process.exit(1);
  }

  if (depEnabled) {
    if (hasDisabled && !hasActive) {
      if (dryRun) {
        console.log("[dry-run] Would rename dependabot.yml.disabled → dependabot.yml");
      } else {
        renameSync(disabled, active);
        console.log("Renamed .github/dependabot.yml.disabled → .github/dependabot.yml (Dependabot on).");
      }
    } else if (hasActive) {
      console.log("Dependabot: .github/dependabot.yml already active (nothing to do).");
    } else if (!hasDisabled && !hasActive) {
      console.warn(
        "Dependabot enabled in config but neither .github/dependabot.yml nor .github/dependabot.yml.disabled exists.",
      );
    }
  } else {
    if (hasActive) {
      if (dryRun) {
        console.log("[dry-run] Would rename dependabot.yml → dependabot.yml.disabled");
      } else {
        renameSync(active, disabled);
        console.log("Renamed .github/dependabot.yml → .github/dependabot.yml.disabled (Dependabot off).");
      }
    } else if (hasDisabled) {
      console.log("Dependabot: already using .github/dependabot.yml.disabled (nothing to do).");
    } else {
      console.log("Dependabot: no dependabot.yml to disable (nothing to do).");
    }
  }
}

main();
