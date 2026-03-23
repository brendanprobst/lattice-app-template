import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Monorepo root (this file: apps/web/next.config.ts) — silences lockfile/workspace root warnings. */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
