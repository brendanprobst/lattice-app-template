/**
 * True when this file is the CLI entry point Node was invoked with, false when only
 * imported. `import.meta.url` already resolves through symlinks, but `process.argv[1]`
 * does not, so a plain string/URL compare between them is false whenever the script is
 * launched through a symlinked path (macOS `/tmp` is one) — the CLI body then silently
 * never runs. Comparing realpaths on both sides fixes that. If either path can't be
 * resolved it warns (naming the entry path) and returns false, so a no-op CLI is visible.
 */
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function isMainModule(importMetaUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(entry);
  } catch (err) {
    console.warn(`isMainModule: could not resolve entry path ${entry} (${err.code ?? err.message}); treating as not main`);
    return false;
  }
}
