#!/usr/bin/env node
/**
 * Build § SCRIPT — sections of a harvest markdown file (spawn vs template inventory).
 *
 *   npm run lattice:harvest-index -- --from ../<child-app>
 *   npm run lattice:harvest-index -- --from ../runout --spawn-name runout
 *   npm run lattice:harvest-index -- --from ../acme-app --out ../cursor/research/harvests/harvest-2026-05-18-acme-app.md
 *
 * Re-run updates SCRIPT sections only; preserves § AGENT — and § REVIEWER — if the output file exists.
 * See docs/playbooks/upstream-harvest.md and the ecosystem plan in cursor/plans/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  DIFF_EXCLUDE_NAMES,
  classifyPath,
  normalizeRelPath,
  resolveProductContext,
} from "./lattice-harvest-paths.mjs";

const templateRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    from: null,
    out: null,
    spawnName: null,
    dryRun: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--from" && args[i + 1]) opts.from = args[++i];
    else if (a === "--out" && args[i + 1]) opts.out = args[++i];
    else if (a === "--spawn-name" && args[i + 1]) opts.spawnName = args[++i];
    else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else {
      console.error(`Unexpected argument: ${a}`);
      process.exit(1);
    }
  }
  if (!opts.from) {
    console.error(
      "Usage: npm run lattice:harvest-index -- --from <child-app-path> [--spawn-name <child-app>] [--out file.md]",
    );
    process.exit(1);
  }
  return opts;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultOutPath(spawnName) {
  return join(templateRoot, "..", "cursor", "research", "harvests", `harvest-${todayIso()}-${spawnName}.md`);
}

function runDiff(templateDir, spawnDir) {
  const excludeArgs = DIFF_EXCLUDE_NAMES.flatMap((name) => ["--exclude", name]);
  const r = spawnSync(
    "diff",
    ["-rq", templateDir, spawnDir, ...excludeArgs],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status !== 0 && r.status !== 1) {
    console.error("diff failed:", out || r.error?.message);
    process.exit(1);
  }
  return out.split("\n").filter(Boolean);
}

function relFromAbs(absPath, root) {
  return normalizeRelPath(absPath.slice(root.length + 1));
}

function parseDiffLines(lines, templateDir, spawnDir) {
  const entries = [];
  for (const line of lines) {
    if (line.startsWith("Files ") && line.includes(" and ") && line.endsWith(" differ")) {
      const m = line.match(/^Files (.+) and (.+) differ$/);
      if (!m) continue;
      const a = m[1].trim();
      const b = m[2].trim();
      let rel;
      if (a.startsWith(templateDir)) rel = relFromAbs(a, templateDir);
      else if (b.startsWith(templateDir)) rel = relFromAbs(b, templateDir);
      else if (a.startsWith(spawnDir)) rel = relFromAbs(a, spawnDir);
      else rel = relFromAbs(b, spawnDir);
      entries.push({ rel, kind: "differ" });
    } else if (line.startsWith("Only in ")) {
      const m = line.match(/^Only in (.+): (.+)$/);
      if (!m) continue;
      const dir = m[1].trim();
      const name = m[2].trim();
      let root;
      let kind;
      if (dir.startsWith(templateDir)) {
        root = templateDir;
        kind = "template-only";
      } else if (dir.startsWith(spawnDir)) {
        root = spawnDir;
        kind = "spawn-only";
      } else continue;
      const parent = dir === root ? "" : relFromAbs(dir, root);
      const rel = parent ? `${parent}/${name}` : name;
      entries.push({ rel, kind });
    }
  }
  return entries;
}

function bucketEntries(entries, productSegments) {
  const buckets = {
    feature: { differ: [], "spawn-only": [] },
    foundation: { differ: [], "spawn-only": [] },
    excluded: { differ: [], "spawn-only": [], "template-only": [] },
    "template-only": [],
  };
  for (const { rel, kind } of entries) {
    const classification = classifyPath(rel, kind, productSegments);
    if (classification === "template-only") {
      buckets["template-only"].push(rel);
    } else if (classification === "excluded") {
      buckets.excluded[kind === "differ" ? "differ" : kind === "spawn-only" ? "spawn-only" : "template-only"].push(rel);
    } else if (classification === "foundation") {
      buckets.foundation[kind === "differ" ? "differ" : "spawn-only"].push(rel);
    } else {
      buckets.feature[kind === "differ" ? "differ" : "spawn-only"].push(rel);
    }
  }
  for (const key of Object.keys(buckets)) {
    if (Array.isArray(buckets[key])) buckets[key].sort();
    else for (const k of Object.keys(buckets[key])) buckets[key][k].sort();
  }
  return buckets;
}

function groupSpawnOnly(paths) {
  const groups = new Map();
  for (const p of paths) {
    const parts = p.split("/");
    const key =
      parts[0] === "apps" && parts.length >= 3
        ? `${parts[0]}/${parts[1]}/${parts[2]}`
        : parts[0] === "docs"
          ? `${parts[0]}/${parts[1] || ""}`
          : parts[0] === "scripts"
            ? "scripts/"
            : parts.slice(0, 2).join("/") || p;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function mdList(items) {
  if (!items.length) return "_None._\n";
  return `${items.map((p) => `- \`${p}\``).join("\n")}\n`;
}

function formatProductContextSection(productMeta) {
  const { inferred, configSpawn, configTemplate } = productMeta;
  let s = `## § SCRIPT — Product exclusion rules

Paths containing these **path segments** are treated as child-app product domain (not upstream platform).

| Source | Segments |
|--------|----------|
| **Inferred** (child-app feature tokens − template) | ${inferred.length ? inferred.map((x) => `\`${x}\``).join(", ") : "_none_"} |
| **Child app config** (\`.lattice/harvest.json\` or \`lattice-harvest.json\`) | ${configSpawn.length ? configSpawn.map((x) => `\`${x}\``).join(", ") : "_none_"} |
| **Template config** (optional defaults in template repo) | ${configTemplate.length ? configTemplate.map((x) => `\`${x}\``).join(", ") : "_none_"} |

To add or override: create \`lattice-harvest.json\` in the child app repo — see \`docs/playbooks/upstream-harvest.md\`.

`;
  return s;
}

function buildScriptSections(buckets, childAppName, templateLabel, childAppLabel, productMeta) {
  const featureDiffers = buckets.feature.differ;
  const featureSpawnOnly = buckets.feature["spawn-only"];
  const foundationDiffers = buckets.foundation.differ;
  const foundationSpawnOnly = buckets.foundation["spawn-only"];

  const productSection = formatProductContextSection(productMeta);

  let feature = `## § SCRIPT — Feature candidates

Paths that differ or exist only in the **child app** (\`${childAppLabel}\`), outside product excludes and foundation list.
Agent: propose universal feature bundles (Track 1).

### Differs (${featureDiffers.length})

${mdList(featureDiffers)}

### Only in child app (${featureSpawnOnly.length})

${mdList(featureSpawnOnly)}

### Suggested groupings (spawn-only clusters)

`;

  const groups = groupSpawnOnly(featureSpawnOnly);
  if (!groups.length) feature += "_No spawn-only feature paths to cluster._\n";
  else {
    for (const [key, paths] of groups) {
      feature += `\n**${key}** (${paths.length} path${paths.length === 1 ? "" : "s"})\n\n`;
      feature += mdList(paths);
    }
  }

  let foundation = `## § SCRIPT — Foundation files changed

Shared platform paths (HTTP, auth, infra, deploy, CI, test harness). Agent: per-hunk audit with \`F-###\` (Track 2).
Compare: \`diff -u "${templateLabel}/<path>" "<child-app>/<path>"\` (this run: \`${childAppLabel}\`)

### Differs (${foundationDiffers.length})

${mdList(foundationDiffers)}

### Only in child app (${foundationSpawnOnly.length})

${mdList(foundationSpawnOnly)}
`;

  const ex = buckets.excluded;
  const excluded = `## § SCRIPT — Excluded and template-only

### Product / child-app domain — differs (${ex.differ.length})

${mdList(ex.differ)}

### Product / child-app domain — only in child app (${ex["spawn-only"].length})

${mdList(ex["spawn-only"])}

### Product / spawn domain — only in ${templateLabel} (${ex["template-only"].length})

${mdList(ex["template-only"])}

### Only in ${templateLabel} (non-product) (${buckets["template-only"].length})

${mdList(buckets["template-only"])}
`;

  return { productSection, feature, foundation, excluded };
}

const AGENT_STUB = `## § AGENT — Feature proposals (Track 1)

_Agent: fill after reading SCRIPT sections. Per candidate: universal?, files, wiring, bake-in vs optional, conflicts._

---

## § AGENT — Foundation audit (Track 2)

_Agent: use foundation sub-skill. Per hunk: \`F-###\`, What, Why, UNIVERSAL|PROTOTYPE|UNSURE, INCLUDE|SKIP|DEFER recommendation._

`;

const REVIEWER_STUB = `## § REVIEWER — Decisions

| Item | Type | Verdict (APPROVE / SKIP / DEFER) | Notes |
|------|------|-----------------------------------|-------|
| _example: email-allowlist_ | feature | | |
| _example: F-001_ | foundation | | |

`;

function preserveTail(existing) {
  if (!existing) return { agent: AGENT_STUB, reviewer: REVIEWER_STUB };
  const agentIdx = existing.indexOf("## § AGENT —");
  const reviewerIdx = existing.indexOf("## § REVIEWER —");
  if (agentIdx === -1) return { agent: AGENT_STUB, reviewer: REVIEWER_STUB };
  const agent =
    reviewerIdx === -1
      ? existing.slice(agentIdx)
      : existing.slice(agentIdx, reviewerIdx);
  const reviewer = reviewerIdx === -1 ? REVIEWER_STUB : existing.slice(reviewerIdx);
  return { agent, reviewer };
}

function buildDocument(opts, buckets, templateDir, spawnDir, productContext) {
  const childAppName = opts.spawnName || basename(spawnDir);
  const templateLabel = "lattice-app-template";
  const { productSection, feature, foundation, excluded } = buildScriptSections(
    buckets,
    childAppName,
    templateLabel,
    childAppName,
    productContext.meta,
  );
  const existing = existsSync(opts.out) ? readFileSync(opts.out, "utf8") : "";
  const { agent, reviewer } = preserveTail(existing);

  const header = `# Harvest index — ${childAppName} → ${templateLabel}

**Generated:** ${new Date().toISOString()}  
**Child app:** \`${spawnDir}\`  
**Template:** \`${templateDir}\`  
**Command:** \`npm run lattice:harvest-index -- --from ${opts.from.replace(templateRoot, ".")}\`

> SCRIPT sections are deterministic (re-run safe). AGENT and REVIEWER sections are preserved on re-run unless missing.

`;

  return `${header}
${productSection}
${feature}
${foundation}
${excluded}
${agent}
${reviewer}`;
}

function main() {
  const opts = parseArgs(process.argv);
  const spawnDir = resolve(process.cwd(), opts.from);
  if (!existsSync(spawnDir)) {
    console.error(`Child app path not found: ${spawnDir}`);
    process.exit(1);
  }
  const spawnName = opts.spawnName || basename(spawnDir);
  opts.out = opts.out ? resolve(process.cwd(), opts.out) : resolve(defaultOutPath(spawnName));
  opts.from = spawnDir;

  const productContext = resolveProductContext(templateRoot, spawnDir);
  const lines = runDiff(templateRoot, spawnDir);
  const entries = parseDiffLines(lines, templateRoot, spawnDir);
  const buckets = bucketEntries(entries, productContext.productSegments);

  const doc = buildDocument(opts, buckets, templateRoot, spawnDir, productContext);

  const counts = {
    feature: buckets.feature.differ.length + buckets.feature["spawn-only"].length,
    foundation: buckets.foundation.differ.length + buckets.foundation["spawn-only"].length,
    excluded:
      buckets.excluded.differ.length +
      buckets.excluded["spawn-only"].length +
      buckets.excluded["template-only"].length,
    templateOnly: buckets["template-only"].length,
  };

  if (opts.dryRun) {
    console.log(doc);
    console.error(
      `\n[dry-run] feature=${counts.feature} foundation=${counts.foundation} excluded=${counts.excluded} template-only=${counts.templateOnly}`,
    );
    return;
  }

  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, doc, "utf8");
  console.log(`Wrote ${opts.out}`);
  console.log(
    `  product segments: ${[...productContext.productSegments].sort().join(", ") || "(none)"}`,
  );
  console.log(
    `  feature candidates: ${counts.feature} | foundation: ${counts.foundation} | excluded: ${counts.excluded} | template-only: ${counts.templateOnly}`,
  );
  console.log("\nNext: agent fills § AGENT — sections (see docs/playbooks/upstream-harvest.md).");
}

main();
