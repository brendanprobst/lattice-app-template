/**
 * Path classification for lattice-harvest-index.mjs (spawn vs template diff).
 */
import {
  hasProductSegment as pathHasProductSegment,
  resolveProductContext,
} from "./lattice-harvest-product-context.mjs";

export { resolveProductContext } from "./lattice-harvest-product-context.mjs";

/** Build / VCS / secrets — omitted from diff invocation. */
export const DIFF_EXCLUDE_NAMES = [
  "node_modules",
  ".git",
  ".turbo",
  ".next",
  "dist",
  "dist-lambda",
  "out",
  "coverage",
  "playwright-report",
  "test-results",
  "package-lock.json",
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.production.local",
  "terraform.tfstate",
  "terraform.tfstate.backup",
  ".terraform",
  ".generated",
  ".DS_Store",
];

/**
 * Foundation paths: shared platform plumbing (Track 2 index).
 */
export const FOUNDATION_PATH_PREFIXES = [
  "apps/api/app.ts",
  "apps/api/lambda.ts",
  "apps/api/bin/",
  "apps/api/utils/httpErrorMapper.ts",
  "apps/api/utils/responseHandler.ts",
  "apps/api/utils/logger.ts",
  "apps/api/auth/",
  "apps/api/infrastructure/container.ts",
  "apps/api/infrastructure/adapters/",
  "apps/api/domain/errors/",
  "scripts/deploy-aws",
  "scripts/scaffold.mjs",
  "scripts/fork.mjs",
  "scripts/lattice-harvest",
  "infra/terraform/",
  ".github/workflows/",
  "apps/web/next.config.ts",
  "apps/web/app/layout.tsx",
  "apps/web/app/providers.tsx",
  "apps/web/client/auth/",
  "apps/web/client/lib/",
  "apps/web/instrumentation-client.ts",
  "test/api/setup.ts",
  "test/api/index.test.ts",
  "test/api/support/",
  "test/api/utils/",
  "package.json",
  "turbo.json",
  "config/repo-features.json",
];

export function normalizeRelPath(p) {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

function matchesPrefix(rel, prefix) {
  if (prefix.endsWith("/")) {
    return rel.startsWith(prefix) || rel === prefix.slice(0, -1);
  }
  if (rel === prefix) return true;
  if (rel.startsWith(`${prefix}/`)) return true;
  if (rel.startsWith(prefix) && rel.length > prefix.length && rel[prefix.length] === ".") {
    return true;
  }
  return false;
}

export function isFoundationPath(relPath) {
  const rel = normalizeRelPath(relPath);
  return FOUNDATION_PATH_PREFIXES.some((prefix) => matchesPrefix(rel, prefix));
}

/**
 * @param {string} relPath
 * @param {"differ"|"spawn-only"|"template-only"} kind
 * @param {Set<string>} productSegments — from resolveProductContext()
 */
export function classifyPath(relPath, kind, productSegments) {
  const rel = normalizeRelPath(relPath);
  if (pathHasProductSegment(rel, productSegments)) return "excluded";
  if (kind === "template-only") return "template-only";
  if (isFoundationPath(rel)) return "foundation";
  return "feature";
}
