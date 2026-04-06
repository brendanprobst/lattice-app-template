import type { PostHog } from "posthog-js";

/**
 * Port for browser analytics backends (PostHog, future vendors, or noop).
 * Keeps `posthog-js` (and init options) behind one boundary.
 */
export interface AnalyticsAdapter {
  /** True when this adapter will send events (false for noop / disabled env). */
  isEnabled(): boolean;

  /** Idempotent client bootstrap — call from `instrumentation-client.ts` before React. */
  initFromEnv(): void;

  /** Record a page view (e.g. App Router navigations). */
  capturePageView(href: string): void;

  /** `PostHogProvider` needs the posthog-js singleton; null when disabled. */
  getPostHogClient(): PostHog | null;
}
