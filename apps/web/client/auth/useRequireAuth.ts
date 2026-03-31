"use client";

import { useAuth } from "@client/auth/AuthProvider";
import { normalizeAppPathname } from "@client/lib/normalizeAppPathname";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const raw = pathname?.trim() ?? "";
      const base = raw === "" ? "/things" : raw;
      const next = normalizeAppPathname(base);
      // Full navigation so sessionStorage / auth edge cases behave like a fresh load (matches E2E + manual hard refresh).
      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, pathname, user]);

  return { user, loading };
}
