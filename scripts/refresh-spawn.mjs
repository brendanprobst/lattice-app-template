#!/usr/bin/env node
/**
 * Re-sync an existing spawn from the local template checkout.
 *
 * Reads <target>/.lattice/refresh.json, snapshots spawn-owned paths, runs scaffold
 * --force --yes, prunes obsolete paths, restores the snapshot.
 *
 *   npm run scaffold:refresh -- --into ../lattice-app-smoke-test
 *   npm run scaffold:refresh -- --into ../lattice-app-smoke-test --dry-run
 *   npm run scaffold:refresh -- --into ../lattice-app-smoke-test --skip-prune
 *   npm run scaffold:refresh -- --into ../lattice-app-smoke-test --skip-prompts
 *   npm run scaffold:refresh -- --into ../lattice-app-smoke-test --skip-tests
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  parsePipelineFlags,
  runPostRefreshPrompts,
  runSpawnCi,
} from "./run-post-refresh-prompts.mjs";

/** Always restored after copy. Spawn-owned identity and secrets, not platform code. */
const DEFAULT_PRESERVE_PATHS = [
  ".lattice/refresh.json",
  ".lattice/infisical.json",
  ".infisical.json",
];

const templateRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    dryRun: false,
    skipPrune: false,
    skipPrompts: false,
    skipTests: false,
    into: null,
  };
  const flags = parsePipelineFlags(args);
  opts.skipPrompts = flags.skipPrompts;
  opts.skipTests = flags.skipTests;
  for (let i = 0; i < flags.rest.length; i++) {
    const a = flags.rest[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--skip-prune") opts.skipPrune = true;
    else if (a === "--into" && flags.rest[i + 1]) opts.into = flags.rest[++i];
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
    preservePaths: Array.isArray(data.preservePaths)
      ? data.preservePaths.filter((p) => typeof p === "string" && p.trim())
      : [],
    notes: typeof data.notes === "string" ? data.notes.trim() : "",
    postRefreshPrompts: Array.isArray(data.postRefreshPrompts)
      ? data.postRefreshPrompts.filter((p) => typeof p === "string" && p.trim())
      : [],
  };
}

function normalizeRel(p) {
  return p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function existingPreserveRels(targetRoot, extra) {
  const seen = new Set();
  const rels = [];
  for (const raw of [...DEFAULT_PRESERVE_PATHS, ...extra]) {
    const rel = normalizeRel(raw);
    if (!rel || seen.has(rel)) continue;
    if (rel.includes("..")) {
      console.error(`Refusing preserve path ${JSON.stringify(raw)} (no ..).`);
      process.exit(1);
    }
    seen.add(rel);
    if (existsSync(join(targetRoot, rel))) rels.push(rel);
  }
  return rels;
}

function snapshotPreserve(targetRoot, rels, snapDir) {
  for (const rel of rels) {
    const dest = join(snapDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(targetRoot, rel), dest, { recursive: true });
  }
}

function restorePreserve(targetRoot, rels, snapDir) {
  for (const rel of rels) {
    const dest = join(targetRoot, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(snapDir, rel), dest, { recursive: true });
    console.log(`  restored: ${rel}`);
  }
}

function printPostRefreshChecklist(targetRoot, templateSha) {
  const rel = relative(process.cwd(), targetRoot) || targetRoot;
  console.log(`
Post-refresh checklist — from the spawn repo:

  cd ${JSON.stringify(rel)}

Then if needed since your last deploy:
  • Supabase Auth redirect URLs (/auth/sign-in, etc.) — see docs/playbooks/supabase-migrations.md
  • Apply new SQL under apps/api/supabase/migrations/
  • Merge each env terraform.tfvars.example → terraform.tfvars; npm run deploy:aws (dev first)
  • Infisical: .lattice/infisical.json is preserved; see docs/playbooks/infisical-github-deploys.md

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

  const preserveRels = existingPreserveRels(targetRoot, manifest.preservePaths);
  if (preserveRels.length > 0) {
    console.log("Preserve (restore after copy):");
    for (const p of preserveRels) {
      console.log(`  - ${p}`);
    }
  }

  if (opts.dryRun) {
    console.log("\n[dry-run] Would run scaffold with --force --yes, then restore preserve paths");
    if (!opts.skipPrune && manifest.prunePaths.length > 0) {
      console.log("[dry-run] Would prune:");
      for (const p of manifest.prunePaths) {
        console.log(`  - ${p}`);
      }
    }
    runPostRefreshPrompts({
      targetRoot,
      kind: "refresh",
      spawnName: manifest.name,
      preservePaths: manifest.preservePaths,
      prompts: manifest.postRefreshPrompts,
      dryRun: true,
      skip: opts.skipPrompts,
    });
    runSpawnCi({ targetRoot, dryRun: true, skip: opts.skipTests });
    printPostRefreshChecklist(targetRoot, templateSha);
    return;
  }

  const snapDir = mkdtempSync(join(tmpdir(), "lattice-refresh-preserve-"));
  snapshotPreserve(targetRoot, preserveRels, snapDir);

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
    "--skip-prompts",
    "--skip-tests",
  ];

  const scaffold = spawnSync(process.execPath, scaffoldArgs, {
    cwd: templateRoot,
    stdio: "inherit",
  });
  if (scaffold.status !== 0) {
    if (preserveRels.length > 0) {
      console.error("\nScaffold failed; restoring spawn-owned paths...");
      restorePreserve(targetRoot, preserveRels, snapDir);
    }
    rmSync(snapDir, { recursive: true, force: true });
    process.exit(scaffold.status ?? 1);
  }

  if (!opts.skipPrune && manifest.prunePaths.length > 0) {
    const preserved = new Set(preserveRels.map(normalizeRel));
    console.log("\nPruning obsolete paths in target...");
    for (const relPath of manifest.prunePaths) {
      const rel = normalizeRel(relPath);
      if (preserved.has(rel)) {
        console.log(`  skip (preserved): ${relPath}`);
        continue;
      }
      const abs = join(targetRoot, relPath);
      if (!existsSync(abs)) {
        console.log(`  skip (not found): ${relPath}`);
        continue;
      }
      rmSync(abs, { recursive: true, force: true });
      console.log(`  removed: ${relPath}`);
    }
  }

  if (preserveRels.length > 0) {
    console.log("\nRestoring spawn-owned paths...");
    restorePreserve(targetRoot, preserveRels, snapDir);
  }
  rmSync(snapDir, { recursive: true, force: true });

  runPostRefreshPrompts({
    targetRoot,
    kind: "refresh",
    spawnName: manifest.name,
    preservePaths: manifest.preservePaths,
    prompts: manifest.postRefreshPrompts,
    dryRun: false,
    skip: opts.skipPrompts,
  });
  runSpawnCi({ targetRoot, dryRun: false, skip: opts.skipTests });

  printPostRefreshChecklist(targetRoot, templateSha);
}

main();
