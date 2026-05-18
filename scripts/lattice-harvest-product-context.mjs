/**
 * Resolve product-path exclusions per spawn: auto-infer + optional config files.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

/** Never treat as product domain when inferring (shared routes / shell). */
export const PLATFORM_PATH_SEGMENTS = new Set([
  "auth",
  "home",
  "profile",
  "ui",
  "ui-gallery",
  "login",
  "health",
  "public",
  "api",
  "docs",
  "things",
  "thing",
  "_not-found",
  "favicon.ico",
]);

/**
 * Directories where immediate child folder names (or route file stems) denote product features.
 */
/** Where product feature names are discovered (keep narrow — avoids `validation`, `infrastructure`, etc.). */
export const FEATURE_DIRECTORY_ANCHORS = [
  "apps/web/app/",
  "apps/web/client/pages/",
  "apps/web/client/features/",
  "apps/api/routes/",
  "apps/api/controllers/",
  "apps/api/domain/entities/",
  "apps/api/application/use-cases/",
];

/** Dropped from inferred segments only (still allowed via spawn config). */
export const INFERENCE_DENYLIST = new Set([
  "validation",
  "infrastructure",
  "infrastructures",
  "input",
  "inputs",
  "payload",
  "payloads",
  "detail",
  "details",
  "result",
  "results",
  "name",
  "names",
  "function",
  "functions",
  "game",
  "games",
  "index",
  "support",
  "memory",
  "adapter",
  "adapters",
  "decorator",
  "decorators",
  "error",
  "errors",
  "type",
  "types",
  "dto",
  "dtos",
]);

const CONFIG_FILENAMES = [".lattice/harvest.json", "lattice-harvest.json"];

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function loadHarvestConfig(repoRoot) {
  for (const rel of CONFIG_FILENAMES) {
    const full = join(repoRoot, rel);
    if (existsSync(full)) return readJsonSafe(full) || {};
  }
  return {};
}

function splitPascalWords(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

function expandToken(token) {
  const t = token.toLowerCase();
  const out = new Set([t]);
  // Plural → singular only (avoids `match` → `matchs`).
  if (t.endsWith("ies") && t.length > 4) {
    out.add(`${t.slice(0, -3)}y`);
  } else if (t.endsWith("ches") || t.endsWith("shes") || t.endsWith("ses") || t.endsWith("xes")) {
    out.add(t.slice(0, -2));
  } else if (t.endsWith("s") && t.length > 3 && !t.endsWith("ss")) {
    out.add(t.slice(0, -1));
  }
  return out;
}

function addTokens(set, raw) {
  if (!raw || typeof raw !== "string") return;
  const cleaned = raw.replace(/\.[^.]+$/, "").toLowerCase();
  if (!cleaned || PLATFORM_PATH_SEGMENTS.has(cleaned)) return;
  for (const t of expandToken(cleaned)) {
    if (!PLATFORM_PATH_SEGMENTS.has(t)) set.add(t);
  }
}

function tokensFromUseCaseFilename(filename) {
  const m = filename.match(
    /^(?:Create|Delete|Get|List|Update|Save|Upsert|Remove)(.+?)UseCase\.tsx?$/i,
  );
  if (!m) return [];
  return splitPascalWords(m[1]);
}

function tokensFromEntityFilename(filename) {
  const m = filename.match(/^(.+?)\.tsx?$/);
  if (!m) return [];
  const base = m[1];
  if (base === "index") return [];
  const controller = base.match(/^(.+)Controller$/i);
  if (controller) return splitPascalWords(controller[1]);
  return splitPascalWords(base);
}

function collectTokensAtAnchor(repoRoot, anchor) {
  const tokens = new Set();
  const dir = join(repoRoot, anchor);
  if (!existsSync(dir)) return tokens;

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return tokens;
  }

  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    if (ent.isDirectory()) {
      addTokens(tokens, ent.name);
    } else if (ent.isFile() && /\.tsx?$/.test(ent.name)) {
      if (anchor.includes("use-cases/")) {
        for (const w of tokensFromUseCaseFilename(ent.name)) addTokens(tokens, w);
      } else if (anchor.includes("entities/") || anchor.includes("controllers/")) {
        for (const w of tokensFromEntityFilename(ent.name)) addTokens(tokens, w);
      } else if (anchor.includes("routes/")) {
        addTokens(tokens, ent.name.replace(/\.tsx?$/, ""));
      }
    }
  }

  return tokens;
}

function collectFeatureTokens(repoRoot) {
  const tokens = new Set();
  for (const anchor of FEATURE_DIRECTORY_ANCHORS) {
    for (const t of collectTokensAtAnchor(repoRoot, anchor)) tokens.add(t);
  }
  return tokens;
}

function segmentsFromConfig(config) {
  const list = [];
  if (Array.isArray(config.productPathSegments)) {
    list.push(...config.productPathSegments);
  }
  if (Array.isArray(config.excludePathSegments)) {
    list.push(...config.excludePathSegments);
  }
  return list;
}

/**
 * @returns {{
 *   productSegments: Set<string>,
 *   meta: { inferred: string[], configSpawn: string[], configTemplate: string[], platform: string[] }
 * }}
 */
export function resolveProductContext(templateRoot, spawnRoot) {
  const templateConfig = loadHarvestConfig(templateRoot);
  const spawnConfig = loadHarvestConfig(spawnRoot);

  const templateTokens = collectFeatureTokens(templateRoot);
  const spawnTokens = collectFeatureTokens(spawnRoot);

  const inferred = new Set();
  if (!spawnConfig.disableInference) {
    for (const t of spawnTokens) {
      if (templateTokens.has(t)) continue;
      if (INFERENCE_DENYLIST.has(t)) continue;
      if (t.length < 3) continue;
      inferred.add(t);
    }
    const spawnRepo = basename(spawnRoot).toLowerCase();
    if (spawnRepo && spawnRepo !== "lattice-app-template" && spawnRepo !== "lattice-app-smoke-test") {
      addTokens(inferred, spawnRepo);
    }
  }

  const productSegments = new Set(inferred);
  for (const seg of segmentsFromConfig(templateConfig)) addTokens(productSegments, seg);
  for (const seg of segmentsFromConfig(spawnConfig)) addTokens(productSegments, seg);

  if (Array.isArray(spawnConfig.platformPathSegments)) {
    for (const p of spawnConfig.platformPathSegments) PLATFORM_PATH_SEGMENTS.add(p.toLowerCase());
  }

  for (const p of PLATFORM_PATH_SEGMENTS) productSegments.delete(p);

  return {
    productSegments,
    meta: {
      inferred: [...inferred].sort(),
      configSpawn: segmentsFromConfig(spawnConfig).sort(),
      configTemplate: segmentsFromConfig(templateConfig).sort(),
      platform: [...PLATFORM_PATH_SEGMENTS].sort(),
    },
  };
}

export function hasProductSegment(relPath, productSegments) {
  const parts = relPath.toLowerCase().split("/");
  for (const seg of productSegments) {
    if (parts.includes(seg)) return true;
  }
  return false;
}
