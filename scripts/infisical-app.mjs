/**
 * Resolve the Infisical app folder slug from `.lattice/infisical.json`.
 *
 * One Infisical project holds every Lattice app. Laptop sync and GitHub
 * Deploy app both use `/<appSlug>/{shared,flags}`. The template repo is
 * not deployed and should not commit a real `.lattice/infisical.json`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const APP_SLUG = /^[a-z][a-z0-9-]*$/;

export function infisicalConfigPath(root) {
  return join(root, ".lattice/infisical.json");
}

export function readAppSlug(root) {
  const file = infisicalConfigPath(root);
  if (!existsSync(file)) {
    console.error(
      "No .lattice/infisical.json. Copy .lattice/infisical.json.example and set appSlug.",
    );
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    console.error(".lattice/infisical.json is not valid JSON.");
    process.exit(1);
  }

  const appSlug = parsed.appSlug;
  if (typeof appSlug !== "string" || !APP_SLUG.test(appSlug)) {
    console.error(
      '.lattice/infisical.json must set "appSlug" to a short name like your-app.',
    );
    process.exit(1);
  }
  return appSlug;
}

export function appFolderPath(appSlug) {
  return `/${appSlug}`;
}

export function appSharedPath(appSlug) {
  return `/${appSlug}/shared`;
}

export function appFlagsPath(appSlug) {
  return `/${appSlug}/flags`;
}

export function appSensitivePath(appSlug) {
  return `/${appSlug}/sensitive`;
}

export function readWorkspaceId(root) {
  const file = join(root, ".infisical.json");
  if (!existsSync(file)) {
    console.error("No .infisical.json. Run `infisical login` and `infisical init` in the repo first.");
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    console.error(".infisical.json is not valid JSON.");
    process.exit(1);
  }
  const id = parsed.workspaceId;
  if (!id || typeof id !== "string") {
    console.error(".infisical.json is missing workspaceId.");
    process.exit(1);
  }
  return id;
}

/** Infisical API root, including `/api`. Never log tokens. */
export function infisicalApiBase(root) {
  let domain = process.env.INFISICAL_DOMAIN;
  const file = join(root, ".infisical.json");
  if (!domain && existsSync(file)) {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      if (typeof parsed.domain === "string" && parsed.domain.trim()) {
        domain = parsed.domain.trim();
      }
    } catch {
      /* workspaceId is validated separately */
    }
  }
  domain = (domain || "https://app.infisical.com").replace(/\/$/, "");
  if (!domain.endsWith("/api")) domain = `${domain}/api`;
  return domain;
}
