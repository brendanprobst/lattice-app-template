/**
 * Post-scaffold / post-refresh steps: Cursor agent prompts + npm ci / npm run ci.
 *
 *   --skip-prompts           skip agent
 *   --skip-tests             skip npm ci + npm run ci
 *   LATTICE_SKIP_PROMPTS=1   same as --skip-prompts
 *   LATTICE_SKIP_TESTS=1     same as --skip-tests
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

export const DEFAULT_SCAFFOLD_PROMPTS = [
  "After scaffold, look only at overwritten documentation (AGENTS.md files, docs/AGENTS.md, README.md, generic docs/playbooks). Skip application code for this pass.",
  "If the only drift is the product name (Lattice / lattice-app-template), rename it to this spawn's name. Do not invent hostnames, Infisical slugs, or AWS account ids.",
  "Do not commit. Do not apply Terraform or deploy.",
];

export function parsePipelineFlags(argv) {
  const out = { skipPrompts: false, skipTests: false, rest: [] };
  for (const a of argv) {
    if (a === "--skip-prompts") out.skipPrompts = true;
    else if (a === "--skip-tests") out.skipTests = true;
    else out.rest.push(a);
  }
  if (process.env.LATTICE_SKIP_PROMPTS === "1" || process.env.LATTICE_SKIP_PROMPTS === "true") {
    out.skipPrompts = true;
  }
  if (process.env.LATTICE_SKIP_TESTS === "1" || process.env.LATTICE_SKIP_TESTS === "true") {
    out.skipTests = true;
  }
  return out;
}

/** @deprecated use parsePipelineFlags */
export const parsePromptFlags = parsePipelineFlags;

function which(cmd) {
  const finder = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(finder, [cmd], { encoding: "utf8", shell: false });
  if (r.status !== 0) return null;
  const first = String(r.stdout || "")
    .trim()
    .split(/\r?\n/)
    .find(Boolean);
  return first || null;
}

export function resolveAgentLauncher() {
  const agent = which("agent");
  if (agent) return { cmd: agent, prefix: [] };
  const cursor = which("cursor");
  if (cursor) return { cmd: cursor, prefix: ["agent"] };
  return null;
}

export function buildPromptText({ kind, spawnName, preservePaths, prompts }) {
  const steps = (prompts || []).map((p, i) => `${i + 1}. ${p}`).join("\n");
  const preserve =
    preservePaths?.length > 0
      ? preservePaths.map((p) => `- ${p}`).join("\n")
      : "(none listed)";
  return `You are running automatically after a Lattice ${kind} into this spawn checkout.

Spawn name: ${spawnName}

preservePaths (spawn-owned; do not overwrite — append substantial spawn-only edits here if git history shows they were lost):
${preserve}

Do this work now. Do not wait for a human.

${steps}

Rules:
- Follow the numbered prompts. Prefer documentation files unless a prompt says otherwise.
- Do not commit.
- Do not apply Terraform, do not deploy, do not refresh or scaffold again.
- Do not print or invent secrets.
`;
}

export function runPostRefreshPrompts({
  targetRoot,
  kind,
  spawnName,
  preservePaths = [],
  prompts = [],
  dryRun = false,
  skip = false,
}) {
  if (skip) {
    console.log("→ skip post-refresh prompts (--skip-prompts)");
    return { ran: false, skipped: true };
  }
  const list = (prompts || []).map((p) => String(p).trim()).filter(Boolean);
  if (list.length === 0) {
    console.log("→ skip post-refresh prompts (none configured)");
    return { ran: false, skipped: true };
  }
  if (!existsSync(targetRoot)) {
    console.error(`Cannot run prompts: target does not exist: ${targetRoot}`);
    process.exit(1);
  }

  const prompt = buildPromptText({ kind, spawnName, preservePaths, prompts: list });
  const launcher = resolveAgentLauncher();

  if (dryRun) {
    console.log("\n[dry-run] Would run post-refresh prompts via agent/cursor agent:\n");
    console.log(prompt);
    return { ran: false, skipped: false, dryRun: true };
  }

  if (!launcher) {
    console.error(
      "postRefreshPrompts are configured but neither `agent` nor `cursor` is on PATH.\n" +
        "Install the Cursor agent CLI (https://cursor.com/install) or re-run with --skip-prompts.",
    );
    process.exit(1);
  }

  const args = [
    ...launcher.prefix,
    "-p",
    "--workspace",
    targetRoot,
    "--trust",
    "--force",
    "--approve-mcps",
    prompt,
  ];
  console.log(`→ running ${list.length} post-refresh prompt(s) with ${launcher.cmd} ${launcher.prefix.join(" ")}\n`);
  const r = spawnSync(launcher.cmd, args, {
    cwd: targetRoot,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (r.error) {
    console.error(r.error.message);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(
      `Post-refresh prompts failed (exit ${r.status ?? 1}). Re-run with --skip-prompts to continue without them.`,
    );
    process.exit(r.status ?? 1);
  }
  console.log("→ post-refresh prompts finished");
  return { ran: true, skipped: false };
}

export function runSpawnCi({ targetRoot, dryRun = false, skip = false }) {
  if (skip) {
    console.log("→ skip npm ci / npm run ci (--skip-tests)");
    return { ran: false, skipped: true };
  }
  if (dryRun) {
    console.log("[dry-run] Would run: npm ci && npm run ci");
    return { ran: false, skipped: false, dryRun: true };
  }
  if (!existsSync(targetRoot)) {
    console.error(`Cannot run tests: target does not exist: ${targetRoot}`);
    process.exit(1);
  }

  console.log("→ npm ci\n");
  const ciInstall = spawnSync("npm", ["ci"], {
    cwd: targetRoot,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (ciInstall.error) {
    console.error(ciInstall.error.message);
    process.exit(1);
  }
  if (ciInstall.status !== 0) {
    console.error("npm ci failed in the spawn. Fix lockfile/install, or re-run with --skip-tests.");
    process.exit(ciInstall.status ?? 1);
  }

  console.log("\n→ npm run ci\n");
  const ci = spawnSync("npm", ["run", "ci"], {
    cwd: targetRoot,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (ci.error) {
    console.error(ci.error.message);
    process.exit(1);
  }
  if (ci.status !== 0) {
    console.error("npm run ci failed in the spawn. Re-run with --skip-tests to continue without tests.");
    process.exit(ci.status ?? 1);
  }
  console.log("→ npm run ci finished");
  return { ran: true, skipped: false };
}
