import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Monorepo root (this file: apps/web/next.config.ts) — silences lockfile/workspace root warnings. */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  output: "export",
  images: {
    unoptimized: true,
  },
  // Next 15 defaults this to true; it injects segment-explorer into RSC and can throw
  // "Could not find the module … in the React Client Manifest" / broken webpack chunks in dev.
  experimental: {
    devtoolSegmentExplorer: false,
  },
  /** Dev-only: first fetch of a route chunk can exceed webpack’s default while `next dev` is still compiling. */
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer && config.output && typeof config.output === "object") {
      config.output.chunkLoadTimeout = 300_000;
    }
    return config;
  },
};

export default nextConfig;
