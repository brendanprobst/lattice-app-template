/**
 * Keep supabase/migrations as symlinks to supabase/migrations/feature-migrations.
 * The Supabase CLI only reads the flat migrations directory. The master
 * migration is never linked, so db push cannot apply it.
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";

export function syncFeatureMigrations(root, { warn = console.warn } = {}) {
  const featureDir = join(root, "supabase", "migrations", "feature-migrations");
  const cliDir = join(root, "supabase", "migrations");
  if (!existsSync(featureDir)) return;
  mkdirSync(cliDir, { recursive: true });
  const features = readdirSync(featureDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const expected = new Set(features);
  for (const name of readdirSync(cliDir)) {
    if (!name.endsWith(".sql")) continue;
    const path = join(cliDir, name);
    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink() && !expected.has(name)) unlinkSync(path);
  }
  for (const name of features) {
    const link = join(cliDir, name);
    const target = join("feature-migrations", name);
    let stat = null;
    try {
      stat = lstatSync(link);
    } catch {
      stat = null;
    }
    if (stat?.isSymbolicLink()) unlinkSync(link);
    else if (stat) {
      warn(
        `Warning: supabase/migrations/${name} is a real file, not a link to feature-migrations/${name}. Left it alone; move it out or delete it.`,
      );
      continue;
    }
    symlinkSync(target, link);
  }
}
