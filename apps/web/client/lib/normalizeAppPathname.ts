/**
 * Map real static-host paths (`/index.html`, `/login.html`, `/auth/sign-in.html`) to App Router paths (`/`, `/auth/sign-in`, …).
 * See `AuthBootstrapShell` — `usePathname()` can reflect the HTML filename in the address bar.
 */
export function normalizeAppPathname(pathname: string | null | undefined): string {
    const raw = typeof pathname === "string" ? pathname.trim() : "";
    const p = raw === "" ? "/" : raw;
    if (p === "/index.html") {
      return "/";
    }
    if (p.endsWith("/index.html")) {
      const base = p.slice(0, -"/index.html".length);
      return base === "" ? "/" : base;
    }
    if (p.endsWith(".html")) {
      const base = p.slice(0, -".html".length);
      return base === "" ? "/" : base;
    }
    return p;
  }
  