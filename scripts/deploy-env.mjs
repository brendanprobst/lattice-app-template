/**
 * Shared --env handling for deploy-aws.mjs and deploy-aws-web.mjs.
 * Default env is dev so existing commands keep targeting infra/terraform/envs/dev.
 */
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import {
  applyEnvFile,
  envFileLabel,
  readEnvFile,
  resolveEnvFile,
  takeEnvArg,
} from "./env-files.mjs";

export { takeEnvArg };

const DEV_PUBLIC_FILES = [".env.dev", ".env.local", ".env", ".env.production.local"];

export function terraformDir(root, env) {
  const tfDir = join(root, "infra/terraform/envs", env);
  if (!existsSync(tfDir)) {
    console.error(`No Terraform env at infra/terraform/envs/${env}`);
    process.exit(1);
  }
  return tfDir;
}

/**
 * Load the web env for this deploy.
 * Dev reads the first of apps/web/.env.dev, .env.local, .env.
 * Any other env reads only apps/web/.env.<env> and overwrites NEXT_PUBLIC_*
 * so a dev file or shell export cannot leak into that build.
 */
export function loadWebEnv(root, env) {
  const webDir = join(root, "apps/web");
  const full = resolveEnvFile(webDir, env);
  if (!full) {
    console.error(
      env === "dev"
        ? `No dev web env file. Create one of ${envFileLabel("apps/web", "dev")}.`
        : `Refusing to build the ${env} site from a dev env file.\n` +
            `Create ${envFileLabel("apps/web", env)} with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
    );
    process.exit(1);
  }

  if (env !== "dev") {
    for (const name of DEV_PUBLIC_FILES) {
      const local = join(webDir, name);
      if (!existsSync(local)) continue;
      for (const key of Object.keys(readEnvFile(local))) {
        if (key.startsWith("NEXT_PUBLIC_")) process.env[key] = "";
      }
    }
  }

  const values = applyEnvFile(full, { override: env !== "dev" });
  if (env !== "dev") {
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
      if (!values[key]?.trim()) {
        console.error(`${relative(root, full)} is missing ${key}.`);
        process.exit(1);
      }
    }
  }

  console.log(`→ web env ${relative(root, full)}`);
}
