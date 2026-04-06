import type { AnalyticsAdapter } from "./AnalyticsAdapter";
import { isPostHogAnalyticsConfigured } from "./analyticsEnv";
import { NoopAnalyticsAdapter } from "./noop/NoopAnalyticsAdapter";
import { PostHogAnalyticsAdapter } from "./posthog/PostHogAnalyticsAdapter";

let singleton: AnalyticsAdapter | null = null;

function createAnalyticsAdapter(): AnalyticsAdapter {
  if (isPostHogAnalyticsConfigured()) {
    return new PostHogAnalyticsAdapter();
  }
  return new NoopAnalyticsAdapter();
}

/**
 * Single browser-side analytics adapter for the app (PostHog or noop).
 */
export function getAnalyticsAdapter(): AnalyticsAdapter {
  if (!singleton) {
    singleton = createAnalyticsAdapter();
  }
  return singleton;
}
