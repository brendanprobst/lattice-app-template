"use client";

import { useAuth } from "@client/auth/AuthProvider";
import { authPaths } from "@client/lib/constants/authPaths";
import { normalizeAppPathname } from "@client/lib/normalizeAppPathname";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

export function useRequireAuth() {
  const { user, loading, apiAuthAccepted } = useAuth();
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!loading && (!user || !apiAuthAccepted)) {
      const raw = pathname?.trim() ?? "";
      const base = raw === "" ? "/things" : raw;
      const next = normalizeAppPathname(base);
      // Full navigation so sessionStorage / auth edge cases behave like a fresh load (matches E2E + manual hard refresh).
      window.location.replace(`${authPaths.signIn}?next=${encodeURIComponent(next)}`);
    }
  }, [apiAuthAccepted, loading, pathname, user]);

  return { user, loading, apiAuthAccepted };
}
