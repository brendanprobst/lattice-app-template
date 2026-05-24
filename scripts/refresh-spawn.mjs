#!/usr/bin/env node
/**
 * Re-sync an existing spawn from the local template checkout.
 *
 * Reads <target>/.lattice/refresh.json, runs scaffold --force --yes, prunes obsolete paths.
 *
 *   npm run scaffold:refresh -- --into ../lattice-app-smoke-test
 *   npm run scaffold:refresh -- --into ../lattice-app-smoke-test --dry-run
 *   npm run scaffold:refresh -- --into ../lattice-app-smoke-test --skip-prune
 */
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const templateRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    dryRun: false,
    skipPrune: false,
    into: null,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--skip-prune") opts.skipPrune = true;
    else if (a === "--into" && args[i + 1]) opts.into = args[++i];
    else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else {
      console.error(`Unexpected argument: ${a}`);
      process.exit(1);
    }
  }
  return opts;
}

function loadRefreshManifest(targetRoot) {
  const manifestPath = join(targetRoot, ".lattice", "refresh.json");
  if (!existsSync(manifestPath)) {
    console.error(
      `Missing ${manifestPath}\n\n` +
        "Copy .lattice/refresh.json.example from the template, fill name/repo/prunePaths, and commit in the spawn repo.",
    );
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    console.error(`Invalid JSON in ${manifestPath}: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
  if (!data.name?.trim() || !data.repo?.trim()) {
    console.error(`${manifestPath} must include non-empty "name" and "repo" fields.`);
    process.exit(1);
  }
  return {
    name: data.name.trim(),
    repo: data.repo.trim(),
    prunePaths: Array.isArray(data.prunePaths) ? data.prunePaths.filter((p) => typeof p === "string" && p.trim()) : [],
    notes: typeof data.notes === "string" ? data.notes.trim() : "",
  };
}

function printPostRefreshChecklist(targetRoot, templateSha) {
  const rel = relative(process.cwd(), targetRoot) || targetRoot;
  console.log(`
Post-refresh checklist — from the spawn repo:

  cd ${JSON.stringify(rel)}
  npm ci
  npm run ci

Then if needed since your last deploy:
  • Supabase Auth redirect URLs (/auth/sign-in, etc.) — see docs/playbooks/supabase-migrations.md
  • Apply new SQL under apps/api/supabase/migrations/
  • Merge terraform.tfvars.example → terraform.tfvars; npm run deploy:aws -- --auto-approve (or deploy:aws:web)

Suggested commit message:
  chore: refresh from lattice-app-template @ ${templateSha}
`);
}

function getTemplateShortSha() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: templateRoot,
    encoding: "utf8",
  });
  if (r.status === 0) {
    return (r.stdout || "").trim() || "unknown";
  }
  return "unknown";
}

function main() {
  const opts = parseArgs(process.argv);
  if (!opts.into) {
    console.error("scaffold:refresh requires --into <path> to an existing spawn repo.");
    process.exit(1);
  }

  const targetRoot = resolve(process.cwd(), opts.into);
  if (!existsSync(targetRoot) || !statSync(targetRoot).isDirectory()) {
    console.error(`Target directory does not exist: ${targetRoot}`);
    process.exit(1);
  }

  const manifest = loadRefreshManifest(targetRoot);
  const templateSha = getTemplateShortSha();

  console.log(`Template:  ${templateRoot} (@ ${templateSha})`);
  console.log(`Target:    ${targetRoot}`);
  console.log(`Spawn:     ${manifest.name}`);
  if (manifest.notes) {
    console.log(`Notes:     ${manifest.notes}`);
  }

  if (opts.dryRun) {
    console.log("\n[dry-run] Would run scaffold with --force --yes");
    if (!opts.skipPrune && manifest.prunePaths.length > 0) {
      console.log("[dry-run] Would prune:");
      for (const p of manifest.prunePaths) {
        console.log(`  - ${p}`);
      }
    }
    printPostRefreshChecklist(targetRoot, templateSha);
    return;
  }

  const scaffoldArgs = [
    "scripts/scaffold.mjs",
    "--into",
    opts.into,
    "--name",
    manifest.name,
    "--repo",
    manifest.repo,
    "--force",
    "--yes",
  ];

  const scaffold = spawnSync(process.execPath, scaffoldArgs, {
    cwd: templateRoot,
    stdio: "inherit",
  });
  if (scaffold.status !== 0) {
    process.exit(scaffold.status ?? 1);
  }

  if (!opts.skipPrune && manifest.prunePaths.length > 0) {
    console.log("\nPruning obsolete paths in target...");
    for (const relPath of manifest.prunePaths) {
      const abs = join(targetRoot, relPath);
      if (!existsSync(abs)) {
        console.log(`  skip (not found): ${relPath}`);
        continue;
      }
      rmSync(abs, { recursive: true, force: true });
      console.log(`  removed: ${relPath}`);
    }
  }

  printPostRefreshChecklist(targetRoot, templateSha);
}

main();
