#!/usr/bin/env node
/**
 * Reminds fork owners to replace the template placeholder in package.json → repository.url.
 * Run: npm run fork:check
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const url = pkg.repository?.url ?? "";

if (url.includes("your-username") || url.includes("lattice-app-template")) {
  console.warn(
    "[fork:check] package.json → repository.url still looks like the template placeholder.\n" +
      "  After you fork, set it to your repo (e.g. git+https://github.com/ORG/REPO.git) so npm and tooling show the right metadata.\n",
  );
  process.exitCode = 0;
} else {
  console.log("[fork:check] repository.url does not use the template placeholder — OK.");
}
