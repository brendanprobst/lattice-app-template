#!/usr/bin/env node
/**
 * Fork quick-start: validate template metadata (`check`) or rename/branding (`init`).
 *
 *   npm run fork:check
 *   npm run fork:init -- --npm-name acme-app --repo https://github.com/acme/acme-app.git
 *   npm run fork:init -- --npm-name acme-app --repo git@github.com:acme/acme-app.git --display-name "Acme" --scope acme
 *   npm run fork:init -- ... --dry-run
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = argv.slice(2);
  const cmd = args[0] === "init" ? "init" : "check";
  const opts = {
    dryRun: false,
    npmName: null,
    repo: null,
    displayName: null,
    scope: null,
  };
  const rest = cmd === "init" ? args.slice(1) : args.slice(1);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--npm-name" && rest[i + 1]) opts.npmName = rest[++i];
    else if (a === "--repo" && rest[i + 1]) opts.repo = rest[++i];
    else if (a === "--display-name" && rest[i + 1]) opts.displayName = rest[++i];
    else if (a === "--scope" && rest[i + 1]) opts.scope = rest[++i].replace(/^@/, "");
    else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    }
  }
  return { cmd, opts };
}

function humanizeKebab(name) {
  return name
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function patchJson(relPath, mutator, { dryRun }) {
  const full = join(root, relPath);
  const raw = readFileSync(full, "utf8");
  const data = JSON.parse(raw);
  mutator(data);
  const next = `${JSON.stringify(data, null, 2)}\n`;
  if (dryRun) {
    console.log(`[dry-run] would write ${relPath}`);
    return;
  }
  writeFileSync(full, next, "utf8");
  console.log(`Updated ${relPath}`);
}

function writeText(relPath, content, { dryRun }) {
  const full = join(root, relPath);
  if (dryRun) {
    console.log(`[dry-run] would write ${relPath} (${content.length} chars)`);
    return;
  }
  writeFileSync(full, content, "utf8");
  console.log(`Updated ${relPath}`);
}

function replaceBranding(content, displayName, apiTitle, supportName) {
  let s = content;
  s = s.replaceAll("Lattice API", apiTitle);
  s = s.replaceAll("Lattice Support", supportName);
  s = s.replaceAll("Lattice", displayName);
  return s;
}

function applyWorkspaceScope(content, scope) {
  return content.replaceAll("@lattice/api", `@${scope}/api`).replaceAll("@lattice/web", `@${scope}/web`);
}

function runCheck() {
  let warnings = 0;
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const url = pkg.repository?.url ?? "";

  if (url.includes("your-username") || url.includes("lattice-app-template")) {
    console.warn(
      "[fork:check] package.json → repository.url still uses the template placeholder.\n" +
        "  Fix: npm run fork:init -- --npm-name <name> --repo <git-url>\n",
    );
    warnings++;
  } else {
    console.log("[fork:check] repository.url — OK");
  }

  if (pkg.name === "lattice-app-template") {
    console.warn(
      "[fork:check] package.json → name is still \"lattice-app-template\".\n" +
        "  Fix: npm run fork:init -- --npm-name <your-npm-package-name> --repo <git-url>\n",
    );
    warnings++;
  } else {
    console.log("[fork:check] package name — OK (not template default)");
  }

  const apiPkg = JSON.parse(readFileSync(join(root, "apps/api/package.json"), "utf8"));
  const webPkg = JSON.parse(readFileSync(join(root, "apps/web/package.json"), "utf8"));
  if (apiPkg.name === "@lattice/api" && webPkg.name === "@lattice/web") {
    console.warn(
      "[fork:check] workspace packages are still @lattice/api and @lattice/web.\n" +
        "  Optional: npm run fork:init -- ... --scope <your-npm-scope> (no @ prefix)\n",
    );
    warnings++;
  } else {
    console.log("[fork:check] workspace package names — customized or OK");
  }

  if (warnings) {
    console.log(`\n[fork:check] ${warnings} reminder(s) — see above.`);
  } else {
    console.log("\n[fork:check] All checks passed.");
  }
}

function runInit(opts) {
  if (!opts.npmName) {
    console.error("fork:init requires --npm-name <kebab-name> (npm-safe package name for the repo root).");
    process.exit(1);
  }
  if (!opts.repo) {
    console.error("fork:init requires --repo <url> (e.g. https://github.com/ORG/REPO.git or git@github.com:ORG/REPO.git).");
    process.exit(1);
  }

  const displayName = opts.displayName?.trim() || humanizeKebab(opts.npmName);
  const apiTitle = `${displayName} API`;
  const supportName = `${displayName} Support`;
  const scope = opts.scope?.trim() || null;

  const brandingFiles = [
    "apps/web/app/layout.tsx",
    "apps/api/routes/index.ts",
    "apps/api/app.ts",
    "apps/api/config/swagger/index.ts",
    "apps/api/config/swagger/decorators/index.decorators.ts",
    "apps/web/client/pages/login/LoginPage.tsx",
    "test/web/unit/HomePage.test.tsx",
    "test/web/e2e/home.spec.ts",
    "test/api/index.test.ts",
  ];

  let rootPkgPath = join(root, "package.json");
  let rootPkgRaw = readFileSync(rootPkgPath, "utf8");
  let rootPkg = JSON.parse(rootPkgRaw);
  rootPkg.name = opts.npmName;
  rootPkg.repository = { type: "git", url: opts.repo };
  if (typeof rootPkg.description === "string") {
    rootPkg.description = rootPkg.description.replace(/^Lattice — /, `${displayName} — `);
  }
  rootPkgRaw = `${JSON.stringify(rootPkg, null, 2)}\n`;
  if (scope) {
    rootPkgRaw = applyWorkspaceScope(rootPkgRaw);
    rootPkg = JSON.parse(rootPkgRaw);
  }
  if (opts.dryRun) {
    console.log("[dry-run] would write package.json");
  } else {
    writeFileSync(rootPkgPath, rootPkgRaw, "utf8");
    console.log("Updated package.json");
  }

  if (scope) {
    patchJson(
      "apps/api/package.json",
      (p) => {
        p.name = `@${scope}/api`;
      },
      opts,
    );
    patchJson(
      "apps/web/package.json",
      (p) => {
        p.name = `@${scope}/web`;
      },
      opts,
    );

    const turboPath = join(root, "turbo.json");
    let turbo = readFileSync(turboPath, "utf8");
    turbo = applyWorkspaceScope(turbo);
    if (opts.dryRun) console.log("[dry-run] would write turbo.json");
    else {
      writeFileSync(turboPath, turbo, "utf8");
      console.log("Updated turbo.json");
    }

    const pwPath = join(root, "test/web/playwright.config.ts");
    let pw = readFileSync(pwPath, "utf8");
    pw = applyWorkspaceScope(pw);
    if (opts.dryRun) console.log("[dry-run] would write test/web/playwright.config.ts");
    else {
      writeFileSync(pwPath, pw, "utf8");
      console.log("Updated test/web/playwright.config.ts");
    }

    const webReadme = join(root, "apps/web/README.md");
    let wr = readFileSync(webReadme, "utf8");
    wr = applyWorkspaceScope(wr);
    if (opts.dryRun) console.log("[dry-run] would write apps/web/README.md");
    else {
      writeFileSync(webReadme, wr, "utf8");
      console.log("Updated apps/web/README.md");
    }
  }

  for (const rel of brandingFiles) {
    const full = join(root, rel);
    let text = readFileSync(full, "utf8");
    text = replaceBranding(text, displayName, apiTitle, supportName);
    writeText(rel, text, opts);
  }

  const uiGallery = join(root, "apps/web/client/pages/ui-gallery/UiGalleryPage.tsx");
  let ug = readFileSync(uiGallery, "utf8");
  ug = replaceBranding(ug, displayName, apiTitle, supportName);
  const webPkgLabel = scope ? `@${scope}/web` : "@lattice/web";
  ug = ug.replace(
    /<p className="text-muted-foreground text-sm">[^<]+<\/p>/,
    `<p className="text-muted-foreground text-sm">${displayName} · ${webPkgLabel}</p>`,
  );
  writeText("apps/web/client/pages/ui-gallery/UiGalleryPage.tsx", ug, opts);

  console.log(
    `\nDone.${opts.dryRun ? " (dry-run — no files written)" : ""}\n` + "Next: npm ci && npm run ci\n",
  );
}

const { cmd, opts } = parseArgs(process.argv);
if (cmd === "check") {
  runCheck();
} else {
  runInit(opts);
}
