"use client";

import { useAuth } from "@client/auth/AuthProvider";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const next = pathname || "/things"; // replace "things" with the default route you want to redirect to
      // Full navigation so sessionStorage / auth edge cases behave like a fresh load (matches E2E + manual hard refresh).
      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, pathname, user]);

  return { user, loading };
}
