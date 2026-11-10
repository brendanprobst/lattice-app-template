#!/usr/bin/env node
/**
 * Apply (or remove) every feature seed, in order. This is the master seed.
 *
 *   npm run supabase:seed
 *   npm run supabase:seed -- --dry-run
 *   npm run supabase:seed:down -- --yes
 *   npm run supabase:seed:things
 *
 * Feature SQL lives in `supabase/migrations/seed/features/` — deliberately outside
 * `supabase/migrations/feature-migrations/`, so `supabase db push` can never ship seed
 * rows to a production project.
 *
 * Why the Management API instead of the Supabase CLI or psql:
 *
 * 1. The CLI has no "run this SQL file against the linked project" command;
 *    `db push` only applies migrations.
 * 2. psql is not a repo dependency and is missing on plenty of dev machines.
 * 3. `POST /v1/projects/{ref}/database/query` runs the batch as `postgres`,
 *    so seeds are not blocked by RLS or grants. A fine-grained token needs the
 *    `database_write` permission.
 *
 * Credentials come from the dev Supabase env file (`.env.dev`, `.env.local`,
 * or `.env`). Seed refuses `--env prod`.
 * See docs/playbooks/supabase-migrations.md.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isMainModule } from "./is-main-module.mjs";
import { applyEnvFile, envFileLabel, resolveEnvFile, takeEnvArg } from "./env-files.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_DIR = "supabase/migrations/seed/features";

export function listSeedFeatures(repoRoot = root) {
  const dir = join(repoRoot, SEED_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql") && !name.endsWith("_down.sql"))
    .sort()
    .map((up) => {
      const name = up.slice(0, -".sql".length);
      return {
        name,
        up: `${SEED_DIR}/${up}`,
        down: `${SEED_DIR}/${name}_down.sql`,
      };
    });
}

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/** Strip the access token from anything we print (API errors echo headers). */
function redactSecrets(text) {
  if (!text) return text;
  let out = String(text);
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (token) out = out.split(token).join("[SUPABASE_ACCESS_TOKEN]");
  return out;
}

function parseArgs(argv) {
  const options = { command: "up", yes: false, dryRun: false, feature: "" };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "up" || arg === "down") options.command = arg;
    else if (arg === "--yes" || arg === "-y") options.yes = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--feature") options.feature = argv[++i] ?? "";
    else if (arg?.startsWith("--feature=")) options.feature = arg.slice("--feature=".length);
    else rest.push(arg);
  }
  if (rest.length > 0) {
    fail(
      `Unknown argument "${rest[0]}". Usage:\n` +
        `  npm run supabase:seed [-- --dry-run]\n` +
        `  npm run supabase:seed:down -- --yes\n` +
        `  npm run supabase:seed:things`,
    );
  }
  return options;
}

/** Print the summary select at the end of each seed file as a small table. */
function printRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log("  (no rows returned)");
    return;
  }
  if (typeof rows[0] !== "object" || rows[0] === null) {
    console.log(`  ${JSON.stringify(rows)}`);
    return;
  }
  const columns = Object.keys(rows[0]);
  const width = (col) =>
    Math.max(col.length, ...rows.map((r) => String(r[col] ?? "").length));
  const widths = Object.fromEntries(columns.map((c) => [c, width(c)]));
  const line = (cells) =>
    `  ${columns.map((c, i) => String(cells[i]).padEnd(widths[c])).join("  ")}`;
  console.log(line(columns));
  console.log(line(columns.map((c) => "-".repeat(widths[c]))));
  for (const row of rows) {
    console.log(line(columns.map((c) => String(row[c] ?? ""))));
  }
}

async function main() {
  const taken = takeEnvArg(process.argv.slice(2));
  if (taken.env !== "dev") {
    fail(
      `Refusing to seed the ${taken.env} project.\n` +
        `  npm run supabase:seed only reads the dev env file.`,
    );
  }
  const options = parseArgs(taken.argv);
  const envPath = resolveEnvFile(join(root, "supabase"), "dev");
  const envFile = envPath ? relative(root, envPath) : envFileLabel("supabase", "dev");
  if (envPath) {
    applyEnvFile(envPath, { override: false });
    console.log(`→ supabase env ${envFile}`);
  } else {
    console.warn(
      `  Note: no dev file at ${envFile} — relying on the ambient environment.`,
    );
  }

  const features = listSeedFeatures();
  const selected = options.feature
    ? features.filter((feature) => feature.name === options.feature)
    : features;
  if (options.feature && selected.length === 0) {
    fail(
      `No seed named "${options.feature}". Features:\n` +
        (features.map((feature) => `  ${feature.name}`).join("\n") || "  (none)"),
    );
  }
  const files = selected.map((feature) =>
    options.command === "down" ? feature.down : feature.up,
  );
  if (options.command === "down") files.reverse();
  for (const relPath of files) {
    if (!existsSync(join(root, relPath))) fail(`Missing SQL file: ${relPath}`);
  }

  if (options.command === "down" && !options.yes) {
    fail(
      `Refusing to delete seed data without confirmation.\n` +
        `  npm run supabase:seed:down -- --yes\n\n` +
        `  It runs each feature _down file against the linked dev project.`,
    );
  }

  const ref = process.env.SUPABASE_PROJECT_REF?.trim();
  if (!ref) {
    fail(
      `SUPABASE_PROJECT_REF is not set.\n` +
        `  Copy supabase/.env.example to ${envFile} and fill in your project ref\n` +
        `  (dashboard URL: https://supabase.com/dashboard/project/<project-ref>).`,
    );
  }

  console.log(`  project: ${ref}`);
  if (files.length === 0) {
    console.log("\n  No feature seeds to apply.\n");
    process.exit(0);
  }

  if (options.dryRun) {
    for (const relPath of files) {
      const query = readFileSync(join(root, relPath), "utf8");
      console.log(
        `\n  --dry-run: ${relPath} — ${query.split("\n").length} lines, ${query.length} bytes.`,
      );
    }
    console.log("\n  Nothing sent.\n");
    process.exit(0);
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    fail(
      `SUPABASE_ACCESS_TOKEN is not set.\n` +
        `  Create one at https://supabase.com/dashboard/account/tokens and add it\n` +
        `  to ${envFile}. A fine-grained token needs the "database_write" permission.\n\n` +
        `  No token? Paste the file under ${SEED_DIR}/ into the dashboard SQL editor instead.`,
    );
  }

  for (const relPath of files) {
    const query = readFileSync(join(root, relPath), "utf8");
    console.log(
      `\n  ${options.command === "down" ? "Removing" : "Applying"} ${relPath}`,
    );
    let response;
    try {
      response = await fetch(
        `https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/database/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        },
      );
    } catch (error) {
      fail(
        `Could not reach api.supabase.com (${error?.code || error?.message || "network error"}).\n` +
          `  Paste ${relPath} into the dashboard SQL editor instead.`,
      );
    }

    const raw = await response.text();
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = raw;
    }

    if (!response.ok) {
      const message =
        (payload && typeof payload === "object" && (payload.message || payload.error)) ||
        (typeof payload === "string" ? payload : "") ||
        response.statusText;
      console.error(`\n  Failed (HTTP ${response.status}): ${redactSecrets(message)}`);
      if (response.status === 401 || response.status === 403) {
        console.error(
          `\n  The token was rejected. Check SUPABASE_ACCESS_TOKEN in ${envFile};\n` +
            `  fine-grained tokens need the "database_write" permission on this project.`,
        );
      } else if (response.status === 404) {
        console.error(
          `\n  Project "${ref}" was not found for this token. Check SUPABASE_PROJECT_REF.`,
        );
      } else if (/permission denied|insufficient/i.test(String(message))) {
        console.error(
          `\n  The SQL ran but was blocked by permissions. Check that the token can run\n` +
            `  SQL as postgres on this project, or paste the file into the dashboard SQL editor.`,
        );
      }
      console.error("");
      process.exit(1);
    }

    console.log("");
    printRows(payload);
  }

  console.log(
    options.command === "down"
      ? "\n  Seed data removed.\n"
      : "\n  Seed applied.\n",
  );
}

if (isMainModule(import.meta.url)) {
  await main();
}
