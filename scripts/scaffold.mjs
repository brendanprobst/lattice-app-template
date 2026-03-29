#!/usr/bin/env node
/**
 * Copy the Lattice template into an existing folder (typically a fresh GitHub clone), then run fork:init.
 *
 * Ideal workflow:
 *   1. Create a repo on GitHub (README-only is fine).
 *   2. Clone it next to this template, e.g. ../my-app
 *   3. From this template repo: npm run scaffold -- --into ../my-app --name my-app --repo <same clone URL>
 *   4. cd into the app, npm ci, commit "Lattice scaffold", push.
 *
 *   npm run scaffold -- --into ../my-app --name my-app --repo https://github.com/org/my-app.git
 *   npm run scaffold -- --folder my-app ...          # sibling ../my-app (no clone yet; creates/overwrites folder)
 *   npm run scaffold -- ... --yes                    # skip confirmation (CI / scripts)
 *   npm run scaffold -- ... --dry-run
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const templateRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Top-level names typical of a new GitHub repo (case-insensitive for files). */
const GITHUB_INIT_SAFE = new Set([
  "readme.md",
  "license",
  "license.md",
  "license.txt",
  ".gitignore",
  ".gitattributes",
  "contributing.md",
  "code_of_conduct.md",
  "security.md",
]);

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    dryRun: false,
    yes: false,
    force: false,
    resetReadme: false,
    noGitInit: false,
    npmName: null,
    folder: null,
    into: null,
    repo: null,
    displayName: null,
    scope: null,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--yes" || a === "-y") opts.yes = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--reset-readme") opts.resetReadme = true;
    else if (a === "--no-git-init") opts.noGitInit = true;
    else if (a === "--name" && args[i + 1]) opts.npmName = args[++i];
    else if (a === "--npm-name" && args[i + 1]) opts.npmName = args[++i];
    else if (a === "--folder" && args[i + 1]) opts.folder = args[++i];
    else if (a === "--into" && args[i + 1]) opts.into = args[++i];
    else if (a === "--repo" && args[i + 1]) opts.repo = args[++i];
    else if (a === "--display-name" && args[i + 1]) opts.displayName = args[++i];
    else if (a === "--scope" && args[i + 1]) opts.scope = args[++i].replace(/^@/, "");
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

function shouldExcludeSourcePath(absPath) {
  const rel = relative(templateRoot, absPath);
  if (rel === "") return false;
  const norm = rel.replace(/\\/g, "/");
  const parts = norm.split("/").filter(Boolean);
  const name = basename(absPath);

  const skipSegments = new Set([
    ".git",
    "node_modules",
    ".turbo",
    ".terraform",
    ".next",
    ".vercel",
    "dist",
    "dist-lambda",
    "out",
    "coverage",
    "playwright-report",
    "test-results",
    "blob-report",
  ]);
  for (const p of parts) {
    if (skipSegments.has(p)) return true;
  }

  if (name.endsWith(".tfstate") || name.includes(".tfstate.")) return true;
  if (name.endsWith(".tfvars") && !name.endsWith(".tfvars.example")) return true;
  if (name === ".terraform.tfstate.lock.info") return true;

  if (name === ".env") return true;
  if (name.startsWith(".env.") && name !== ".env.example" && !name.endsWith(".env.example")) {
    return true;
  }

  return false;
}

function listTopLevelForDisplay(dir) {
  try {
    return readdirSync(dir).filter((n) => n !== ".git");
  } catch {
    return [];
  }
}

/**
 * @returns { "empty" | "github-minimal" | "has-extra" }
 */
function classifyExistingTree(dir) {
  const top = listTopLevelForDisplay(dir);
  if (top.length === 0) return "empty";

  const allSafe = top.every((name) => {
    if (name === ".github") return true;
    const low = name.toLowerCase();
    if (low === "readme.md") return true;
    return GITHUB_INIT_SAFE.has(low);
  });

  return allSafe ? "github-minimal" : "has-extra";
}

function formatExistingSummary(dir) {
  const top = listTopLevelForDisplay(dir);
  if (top.length === 0) return "(nothing except .git — empty working tree)";
  if (top.length <= 12) return top.join(", ");
  return `${top.slice(0, 12).join(", ")} … (+${top.length - 12} more)`;
}

async function confirmProceed(opts, targetRoot, kind) {
  if (opts.yes || opts.dryRun) return true;

  const summary = formatExistingSummary(targetRoot);
  console.log("");
  console.log("About to copy the Lattice template into:");
  console.log(`  ${targetRoot}`);
  console.log("");
  console.log(`Existing items (excluding .git): ${summary}`);
  console.log("");

  let question;
  let defaultYes = false;
  if (kind === "has-extra") {
    defaultYes = false;
    if (opts.force) {
      question =
        "You passed --force: merging into a folder that already has extra files. " +
        "Template files will overwrite matching paths.\nProceed? [y/N] ";
    } else {
      question =
        "This folder has files beyond a typical empty GitHub repo. " +
        "Template files will be merged in; names that match will be overwritten.\nProceed? [y/N] ";
    }
  } else {
    defaultYes = true;
    question =
      "The full template will be added (fork branding applied).\nProceed? [Y/n] ";
  }

  const rl = createInterface({ input, output });
  try {
    const raw = (await rl.question(question)).trim().toLowerCase();
    if (raw === "") return defaultYes;
    if (["y", "yes"].includes(raw)) return true;
    if (["n", "no"].includes(raw)) return false;
    console.error("Please answer y or n.");
    return false;
  } finally {
    rl.close();
  }
}

async function runScaffold(opts) {
  if (!opts.npmName) {
    console.error(
      "scaffold requires --name <kebab-case> (or --npm-name) — npm-safe package name for the new app.",
    );
    process.exit(1);
  }
  if (!opts.repo) {
    console.error(
      "scaffold requires --repo <url> — use the same Git URL you cloned (e.g. https://github.com/ORG/REPO.git).",
    );
    process.exit(1);
  }

  let targetRoot;
  /** `--into` must point at an existing folder (e.g. clone). `--folder` can create a new sibling directory. */
  let intoMustExist = false;
  if (opts.into) {
    targetRoot = resolve(process.cwd(), opts.into);
    intoMustExist = true;
  } else if (opts.folder) {
    const folderName = opts.folder;
    if (folderName.includes("/") || folderName.includes("\\") || folderName === "." || folderName === "..") {
      console.error(`Invalid --folder: "${folderName}" (must be a single path segment). Use --into for arbitrary paths.`);
      process.exit(1);
    }
    targetRoot = join(dirname(templateRoot), folderName);
  } else {
    console.error(
      "scaffold requires --into <path> (recommended: path to your cloned GitHub repo) or --folder <name> (sibling folder ../<name>).",
    );
    process.exit(1);
  }

  if (intoMustExist && !existsSync(targetRoot)) {
    console.error(
      `Target folder does not exist:\n  ${targetRoot}\n\n` +
        "Create the GitHub repo, clone it (e.g. git clone … next to this template), then pass --into with that path.",
    );
    process.exit(1);
  }

  if (!existsSync(targetRoot)) {
    mkdirSync(targetRoot, { recursive: true });
    console.log(`Created directory:\n  ${targetRoot}`);
  }

  const st = statSync(targetRoot);
  if (!st.isDirectory()) {
    console.error(`Target must be a directory: ${targetRoot}`);
    process.exit(1);
  }

  const kind = classifyExistingTree(targetRoot);
  const hasGit = existsSync(join(targetRoot, ".git"));

  console.log(`Template:  ${templateRoot}`);
  console.log(`Target:    ${targetRoot}`);
  if (hasGit) {
    console.log("Detected:  existing .git (clone will be preserved).");
  } else {
    console.log("Note:      no .git in target — a new repo can be initialized unless --no-git-init.");
  }

  if (opts.dryRun) {
    console.log("");
    console.log("[dry-run] Would merge template files (excluding build artifacts and secrets from the template).");
    console.log(`[dry-run] Target classification: ${kind}`);
    if (!opts.noGitInit && !hasGit) console.log("[dry-run] Would run: git init -b main");
    console.log("[dry-run] Would run: node scripts/fork.mjs init ...");
    if (!opts.yes) console.log("[dry-run] Would prompt for confirmation (use --yes to skip).");
    return;
  }

  if (!opts.yes && !input.isTTY) {
    console.error(
      "stdin is not a terminal; cannot show the confirmation prompt. Re-run with --yes, or run from an interactive shell.",
    );
    process.exit(1);
  }

  const ok = await confirmProceed(opts, targetRoot, kind);
  if (!ok) {
    console.log("Aborted.");
    process.exit(1);
  }

  cpSync(templateRoot, targetRoot, {
    recursive: true,
    filter: (src) => !shouldExcludeSourcePath(src),
  });

  if (!opts.noGitInit && !existsSync(join(targetRoot, ".git"))) {
    const git = spawnSync("git", ["init", "-b", "main"], { cwd: targetRoot, encoding: "utf8" });
    if (git.status !== 0) {
      console.error(git.stderr || git.stdout || "git init failed");
      process.exit(1);
    }
    console.log("Initialized empty Git repository (branch main).");
  }

  const forkArgs = ["scripts/fork.mjs", "init", "--npm-name", opts.npmName, "--repo", opts.repo];
  if (opts.displayName) forkArgs.push("--display-name", opts.displayName);
  if (opts.scope) forkArgs.push("--scope", opts.scope);
  if (opts.resetReadme) forkArgs.push("--reset-readme");

  const fork = spawnSync(process.execPath, forkArgs, {
    cwd: targetRoot,
    stdio: "inherit",
    env: { ...process.env },
  });
  if (fork.status !== 0) {
    process.exit(fork.status ?? 1);
  }

  const cdRel = relative(process.cwd(), targetRoot);

  console.log(`
Done. Next — from your app folder:
  cd ${JSON.stringify(cdRel)}

  npm ci
  npm run ci
  cp apps/api/.env.example apps/api/.env
  cp apps/web/.env.example apps/web/.env.local
  npm run dev

First commit (if you cloned from GitHub, origin may already exist):
  git status
  git add -A
  git commit -m "Lattice scaffold"
  git push -u origin main
`);
}

const opts = parseArgs(process.argv);
runScaffold(opts).catch((err) => {
  console.error(err);
  process.exit(1);
});
