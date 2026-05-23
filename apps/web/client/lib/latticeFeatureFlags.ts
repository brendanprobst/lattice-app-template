/**
 * Canonical registry for browser-visible Lattice toggles (`NEXT_PUBLIC_LATTICE_*`).
 *
 * Importers should use these helpers instead of reading `process.env` ad hoc so
 * keys stay documented in one place. See `apps/web/.env.example`.
 */

function isLatticeBinaryEnv(raw: string | undefined): boolean {
  return raw?.trim() === "1";
}

/** Playwright / synthetic auth — disables analytics and changes API token behavior. */
export function isLatticeE2eEnabled(): boolean {
  return isLatticeBinaryEnv(process.env.NEXT_PUBLIC_LATTICE_E2E);
}
