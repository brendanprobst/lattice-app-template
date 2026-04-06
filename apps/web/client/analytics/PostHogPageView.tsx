"use client";

import { getAnalyticsAdapter } from "@client/lib/analytics/getAnalyticsAdapter";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Emits `$pageview` on initial load and on client-side navigations (App Router).
 * Only mounted from `app/providers.tsx` when analytics is enabled.
 */
export function PostHogPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }
    const href = typeof window !== "undefined" ? window.location.href : pathname;
    getAnalyticsAdapter().capturePageView(href);
  }, [pathname]);

  return null;
}
